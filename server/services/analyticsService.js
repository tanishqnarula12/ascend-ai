import { query } from '../config/db.js';
import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';

export const calculateConsistencyScore = async (userId) => {
    try {
        // Fetch last 30 days data
        const tasksRes = await query(
            `SELECT is_completed, difficulty, created_at 
             FROM tasks 
             WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days'`,
            [userId]
        );

        const tasks = tasksRes.rows;
        if (tasks.length === 0) return { score: 0, trend: 'stable' };

        const completed = tasks.filter(t => t.is_completed).length;
        const completionRate = (completed / tasks.length) * 100;

        const hardTasks = tasks.filter(t => t.difficulty === 'hard').length;
        const hardRatio = (hardTasks / tasks.length) * 100;

        // Fetch streak
        const streakRes = await query(
            `WITH DailyCompletions AS (
                SELECT DISTINCT DATE(completed_at) as date
                FROM tasks
                WHERE user_id = $1 AND is_completed = true
            ),
            RecentCompletions AS (
                SELECT date, (CURRENT_DATE - date)::integer as days_ago
                FROM DailyCompletions
                WHERE (CURRENT_DATE - date)::integer >= 0
            ),
            StreakGroups AS (
                SELECT days_ago, days_ago - (ROW_NUMBER() OVER (ORDER BY days_ago))::integer as grp
                FROM RecentCompletions
            )
            SELECT COUNT(*) as streak
            FROM StreakGroups
            WHERE grp = (SELECT min(grp) FROM StreakGroups WHERE days_ago IN (0, 1))`,
            [userId]
        );
        const streak = parseInt(streakRes.rows[0].streak) || 0;

        // Run local formula matching the AI server logic
        const streakScore = Math.min(streak * 5, 100);
        const diffBalance = 100 - Math.abs(hardRatio - 33) * 2;
        const score = Math.round((completionRate * 0.4) + (streakScore * 0.2) + (diffBalance * 0.2) + (completionRate * 0.2));
        const trend = completionRate > 50 ? 'up' : 'down';

        const aiData = { score, trend };

        // Save to DB
        await query(
            `INSERT INTO consistency_scores (user_id, score, trend) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (user_id, captured_at) 
             DO UPDATE SET score = EXCLUDED.score, trend = EXCLUDED.trend`,
            [userId, aiData.score, aiData.trend]
        );

        return aiData;
    } catch (error) {
        console.error("Analytics Service Error:", error);
        return { score: 0, trend: 'stable' };
    }
};

const clamp01 = (n) => Math.max(0, Math.min(1, n));

const FACTOR_LABELS = {
    workload: 'a heavy task volume',
    difficulty: 'too many hard tasks stacked together',
    incompletion: 'committing to more than you actually finish',
    momentum: 'a sharp drop in your completion rate',
    relentlessness: 'grinding every day with no rest',
};

const FACTOR_TIPS = {
    workload: 'Trim the list — pick the 3 tasks that truly move the needle today.',
    difficulty: 'Slot some easy wins between the hard tasks so you can recover.',
    incompletion: 'Commit to fewer tasks and actually close them out — quality over quantity.',
    momentum: 'Lower the bar for a day or two to rebuild your streak gently.',
    relentlessness: 'Block out one deliberate rest day this week — recovery is part of progress.',
};

/**
 * Weighted multi-factor burnout model.
 * Instead of a couple of hard thresholds (which almost always returned "LOW"),
 * we score five independent stress signals 0–100 and blend them into a single
 * continuous risk score, then map that to a level. This reacts to real workload
 * patterns so it can surface MODERATE / HIGH / SEVERE when they're warranted.
 */
export const computeBurnout = (rows, activeDays = 0) => {
    if (!rows || rows.length === 0) {
        return {
            risk_level: 'N/A (Inactive)',
            score: 0,
            factors: {},
            primary_driver: null,
            recommendation: 'Log a few tasks so we can read your workload.',
        };
    }

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 86400000;

    const thisWeek = rows.filter(t => new Date(t.created_at).getTime() >= sevenDaysAgo);
    const prevWeek = rows.filter(t => new Date(t.created_at).getTime() < sevenDaysAgo);

    const rateOf = (arr) => arr.length ? (arr.filter(t => t.is_completed).length / arr.length) * 100 : 0;

    const volume = thisWeek.length;
    const compThis = rateOf(thisWeek);
    const compPrev = rateOf(prevWeek);
    const hardRatio = volume ? (thisWeek.filter(t => t.difficulty === 'hard').length / volume) * 100 : 0;

    // --- Five stress factors, each scored 0–100 ---
    // 1. Workload volume: ~10 tasks/week is healthy, 35+ is overload.
    const workload = clamp01((volume - 10) / 25) * 100;
    // 2. Difficulty strain: a wall of "hard" tasks with no easy recovery wins.
    const difficulty = clamp01((hardRatio - 20) / 60) * 100;
    // 3. Incompletion pressure: over-committing and leaving tasks unfinished (scaled by how much you took on).
    const incompletion = clamp01((100 - compThis) / 100) * 100 * clamp01(volume / 6);
    // 4. Momentum drop: this week meaningfully worse than last week.
    const momentum = prevWeek.length ? clamp01((compPrev - compThis) / 40) * 100 : 0;
    // 5. Relentlessness: active every single day with no rest day in the last week.
    const relentlessness = clamp01((activeDays - 4) / 3) * 100;

    const factors = {
        workload: Math.round(workload),
        difficulty: Math.round(difficulty),
        incompletion: Math.round(incompletion),
        momentum: Math.round(momentum),
        relentlessness: Math.round(relentlessness),
    };

    const score = Math.round(
        workload * 0.20 +
        difficulty * 0.22 +
        incompletion * 0.26 +
        momentum * 0.22 +
        relentlessness * 0.10
    );

    let risk_level = 'LOW';
    if (score >= 80) risk_level = 'SEVERE';
    else if (score >= 60) risk_level = 'HIGH';
    else if (score >= 35) risk_level = 'MODERATE';

    // Pick the dominant contributor for a tailored recommendation.
    let primary_driver = null;
    let recommendation = "You're well balanced right now — keep your current rhythm.";
    const top = Object.entries(factors).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] > 0 && score >= 35) {
        primary_driver = top[0];
        recommendation = `Main driver: ${FACTOR_LABELS[top[0]]}. ${FACTOR_TIPS[top[0]]}`;
    }

    return { risk_level, score, factors, primary_driver, recommendation };
};

export const getBurnoutRisk = async (userId) => {
    try {
        // Pull two weeks so we can compare this week's momentum against last week's.
        const tasksRes = await query(
            `SELECT difficulty, is_completed, created_at, completed_at FROM tasks
             WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '14 days'`,
            [userId]
        );

        // Distinct days with a completion in the last 7 days → detects "no rest day".
        const activeDaysRes = await query(
            `SELECT COUNT(DISTINCT DATE(completed_at)) AS days FROM tasks
             WHERE user_id = $1 AND is_completed = true AND completed_at >= CURRENT_DATE - INTERVAL '7 days'`,
            [userId]
        );
        const activeDays = parseInt(activeDaysRes.rows[0]?.days) || 0;

        // Fold today's quick to-dos into the workload — but ONLY if the user actually
        // has some. If there are no to-dos, burnout stays purely task-driven (as before).
        // Each to-do is treated as a medium-difficulty unit of committed work for today.
        let rows = tasksRes.rows;
        try {
            const todosRes = await query(
                `SELECT done FROM quick_todos WHERE user_id = $1 AND date = CURRENT_DATE`,
                [userId]
            );
            if (todosRes.rows.length > 0) {
                const nowIso = new Date().toISOString();
                const todoRows = todosRes.rows.map(t => ({
                    difficulty: 'medium',
                    is_completed: t.done,
                    created_at: nowIso,
                    completed_at: t.done ? nowIso : null,
                }));
                rows = [...rows, ...todoRows];
            }
        } catch { /* table may not exist yet — ignore, fall back to tasks only */ }

        return computeBurnout(rows, activeDays);
    } catch (error) {
        console.error("Burnout Service Error:", error);
        return { risk_level: 'LOW', score: 0, factors: {}, primary_driver: null, recommendation: 'Keep a steady, sustainable pace.' };
    }
};

export const getHeatmapData = async (userId) => {
    try {
        const res = await query(
            `SELECT 
                DATE(completed_at) as date,
                COUNT(*) as count,
                ROUND(AVG(CASE WHEN is_completed THEN 100 ELSE 0 END)) as percentage
             FROM tasks 
             WHERE user_id = $1 AND completed_at IS NOT NULL
             GROUP BY DATE(completed_at)
             ORDER BY date ASC`,
            [userId]
        );
        return res.rows;
    } catch (error) {
        return [];
    }
};
