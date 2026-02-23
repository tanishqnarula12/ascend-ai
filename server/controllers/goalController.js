import { query } from '../config/db.js';

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

        res.json({
            graphData: finalData,
            streak: streak,
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
