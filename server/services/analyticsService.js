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

        // Call AI Service
        const aiResponse = await fetchWithTimeout(`${process.env.AI_SERVICE_URL}/consistency`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                completion_rate: completionRate,
                streak: streak,
                hard_task_ratio: hardRatio,
                momentum: completionRate // Simplified momentum for now
            })
        });

        const aiData = await aiResponse.json();

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

export const getBurnoutRisk = async (userId) => {
    let tasks = [];
    try {
        const tasksRes = await query(
            `SELECT difficulty, is_completed FROM tasks 
             WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'`,
            [userId]
        );

        tasks = tasksRes.rows;
        const hardRatio = (tasks.filter(t => t.difficulty === 'hard').length / (tasks.length || 1)) * 100;
        const completionRate = (tasks.filter(t => t.is_completed).length / (tasks.length || 1)) * 100;

        const aiResponse = await fetchWithTimeout(`${process.env.AI_SERVICE_URL}/burnout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hard_task_ratio: hardRatio,
                momentum: completionRate,
                streak_broken: completionRate < 50,
                tasks_this_week: tasks.length
            })
        });

        return await aiResponse.json();
    } catch (error) {
        return { risk_level: tasks.length === 0 ? 'LOW' : 'LOW' };
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
