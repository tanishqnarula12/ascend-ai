import { query } from '../config/db.js';
import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';

export const getReports = async (req, res) => {
    try {
        const reports = await query(
            'SELECT * FROM weekly_reports WHERE user_id = $1 ORDER BY start_date DESC',
            [req.user.id]
        );

        // Total Tasks ever completed (Progress till date)
        const totalRes = await query(
            'SELECT COUNT(*) as count FROM tasks WHERE user_id = $1 AND is_completed = true',
            [req.user.id]
        );
        const totalCompletedEver = parseInt(totalRes.rows[0].count);

        let generateNew = false;

        if (reports.rows.length === 0) {
            // Activate AI reports page if the user has consistency of even 1 day (at least 1 completed task)
            if (totalCompletedEver > 0) {
                generateNew = true;
            }
        } else {
            const latestReportObj = reports.rows[0];
            const end = new Date(latestReportObj.end_date);
            const now = new Date();
            const diffDays = Math.floor((now - end) / (1000 * 60 * 60 * 24));
            // Trigger new report generation if it's been 7 days since the last end_date
            if (diffDays >= 7) {
                generateNew = true;
            }
        }

        if (generateNew) {
            // Actual Weekly Stats
            const tasksRes = await query(
                `SELECT is_completed, difficulty FROM tasks 
                 WHERE user_id = $1 AND (created_at >= CURRENT_DATE - INTERVAL '7 days' OR completed_at >= CURRENT_DATE - INTERVAL '7 days')`,
                [req.user.id]
            );

            const tasks = tasksRes.rows;
            const completed = tasks.filter(t => t.is_completed).length;
            const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
            const focusHoursEstimate = tasks.filter(t => t.difficulty === 'hard' && t.is_completed).length * 1.5;

            // Optional: determine strongest/weakest goal based on progress
            const goalsRes = await query(
                `SELECT title, progress FROM goals WHERE user_id = $1 AND status = 'in-progress' ORDER BY progress DESC`,
                [req.user.id]
            );
            const strongest = goalsRes.rows.length > 0 ? goalsRes.rows[0].title : null;
            const weakest = goalsRes.rows.length > 1 ? goalsRes.rows[goalsRes.rows.length - 1].title : null;

            let aiData = {
                ai_summary: `You completed ${completionRate}% of your tasks this week! Lifetime progress: ${totalCompletedEver} tasks. Keep up the consistency.`,
                burnout_risk: "LOW"
            };

            if (process.env.AI_SERVICE_URL) {
                try {
                    const aiReportRes = await fetchWithTimeout(`${process.env.AI_SERVICE_URL}/weekly-report`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: req.user.username,
                            completion_rate: completionRate,
                            total_tasks_completed: totalCompletedEver
                        })
                    });
                    aiData = await aiReportRes.json();
                } catch (e) {
                    console.warn("AI Report generation failed, using fallback.", e);
                }
            }

            const newReport = await query(
                `INSERT INTO weekly_reports 
                 (user_id, start_date, end_date, completion_rate, burnout_risk, ai_summary, focus_hours, strongest_goal, weakest_goal, total_tasks_completed)
                 VALUES ($1, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [
                    req.user.id,
                    completionRate,
                    aiData.burnout_risk || "LOW",
                    aiData.ai_summary || `Great work this week! Lifetime progress: ${totalCompletedEver} tasks.`,
                    Math.round(focusHoursEstimate),
                    strongest,
                    weakest,
                    totalCompletedEver
                ]
            );
            return res.json([newReport.rows[0], ...reports.rows]);
        }

        res.json(reports.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getGoals = async (req, res) => {
    try {
        const goals = await query('SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(goals.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createGoal = async (req, res) => {
    const { title, description, category, goal_type, deadline } = req.body;
    try {
        const newGoal = await query(
            'INSERT INTO goals (user_id, title, description, category, goal_type, deadline) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [req.user.id, title, description, category, goal_type, deadline]
        );
        res.status(201).json(newGoal.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateGoal = async (req, res) => {
    const { id } = req.params;
    const { title, description, status, progress } = req.body;
    try {
        const updatedGoal = await query(
            'UPDATE goals SET title = COALESCE($1, title), description = COALESCE($2, description), status = COALESCE($3, status), progress = COALESCE($4, progress) WHERE id = $5 AND user_id = $6 RETURNING *',
            [title, description, status, progress, id, req.user.id]
        );
        if (updatedGoal.rows.length === 0) {
            return res.status(404).json({ message: 'Goal not found' });
        }

        if (status === 'completed') {
            await query('UPDATE users SET xp = xp + 250 WHERE id = $1', [req.user.id]);
        }

        res.json(updatedGoal.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteGoal = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query('DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Goal not found' });
        }
        res.json({ message: 'Goal deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAnalytics = async (req, res) => {
    try {
        const result = await query(
            `SELECT 
        TO_CHAR(completed_at, 'Dy') as day,
        COUNT(*) as completion
      FROM tasks 
      WHERE user_id = $1 
        AND is_completed = true 
        AND completed_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY TO_CHAR(completed_at, 'Dy'), DATE(completed_at)
      ORDER BY DATE(completed_at) ASC`,
            [req.user.id]
        );

        // Map short days to full list
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dataMap = result.rows.reduce((acc, row) => {
            acc[row.day] = parseInt(row.completion);
            return acc;
        }, {});

        const finalData = days.map(d => ({
            name: d,
            completion: dataMap[d] || 0
        }));

        // Calculate streak (consecutive days with at least one task)
        const streakRes = await query(
            `WITH DailyCompletions AS (
                SELECT DISTINCT DATE(completed_at) as completed_date
                FROM tasks
                WHERE user_id = $1 AND is_completed = true
            ),
            StreakCalc AS (
                SELECT 
                    completed_date,
                    completed_date - (ROW_NUMBER() OVER (ORDER BY completed_date))::integer as group_id
                FROM DailyCompletions
            )
            SELECT COUNT(*) as streak
            FROM StreakCalc
            GROUP BY group_id
            ORDER BY streak DESC
            LIMIT 1`,
            [req.user.id]
        );

        const streak = streakRes.rows.length > 0 ? parseInt(streakRes.rows[0].streak) : 0;

        // Calculate focus areas based on goal categories
        const focusAreasRes = await query(
            `SELECT category as name, COUNT(*) as count
             FROM goals
             WHERE user_id = $1 AND status = 'in-progress'
             GROUP BY category
             ORDER BY count DESC
             LIMIT 3`,
            [req.user.id]
        );

        const totalTasksRes = await query(
            'SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND is_completed = true',
            [req.user.id]
        );
        const totalTasks = parseInt(totalTasksRes.rows[0].count);

        res.json({
            graphData: finalData,
            streak: streak,
            totalTasks: totalTasks,
            focusAreas: focusAreasRes.rows.length > 0 ? focusAreasRes.rows : [
                { name: 'Deep Work' },
                { name: 'Task Management' },
                { name: 'General Growth' }
            ]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
export const updateGoalProgress = async (goalId, userId) => {
    try {
        const stats = await query(
            `SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE is_completed = true) as completed
             FROM tasks WHERE goal_id = $1 AND user_id = $2`,
            [goalId, userId]
        );

        const { total, completed } = stats.rows[0];

        const goalDataRes = await query('SELECT status, goal_type FROM goals WHERE id = $1', [goalId]);
        const goal = goalDataRes.rows[0];

        // Enforce progressive breakdown: min 4 tasks for short-term, 10 for long-term
        const minTasks = goal.goal_type === 'long-term' ? 10 : 4;
        const effectiveTotal = Math.max(parseInt(total), minTasks);

        const progress = total > 0 ? Math.round((parseInt(completed) / effectiveTotal) * 100) : 0;


        await query(
            `UPDATE goals SET progress = $1, 
             status = CASE WHEN $1 = 100 THEN 'completed' ELSE 'in-progress' END 
             WHERE id = $2`,
            [progress, goalId]
        );

        // XP bonus logic removed per user request
    } catch (error) {
        console.error("Error updating goal progress:", error);
    }
};
