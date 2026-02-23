import { query } from '../config/db.js';

export const startFocusSession = async (req, res) => {
    const { task_id } = req.body;
    try {
        const result = await query(
            'INSERT INTO focus_sessions (user_id, linked_task_id) VALUES ($1, $2) RETURNING *',
            [req.user.id, task_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const endFocusSession = async (req, res) => {
    const { id } = req.params;
    const { distractions_count } = req.body;
    try {
        const session = await query('SELECT start_time FROM focus_sessions WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (session.rows.length === 0) return res.status(404).json({ message: 'Session not found' });

        const startTime = new Date(session.rows[0].start_time);
        const endTime = new Date();
        const durationMinutes = Math.round((endTime - startTime) / 60000);

        const result = await query(
            `UPDATE focus_sessions 
             SET end_time = $1, duration_minutes = $2, distractions_count = $3 
             WHERE id = $4 RETURNING *`,
            [endTime, durationMinutes, distractions_count, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getFocusStats = async (req, res) => {
    try {
        const sessions = await query(
            `SELECT SUM(duration_minutes) as total_minutes, AVG(duration_minutes) as avg_session 
             FROM focus_sessions WHERE user_id = $1 AND start_time >= CURRENT_DATE - INTERVAL '7 days'`,
            [req.user.id]
        );

        const totalMinutes = sessions.rows[0].total_minutes || 0;
        // Focus Score formula: (Minutes / 480) * 100 - (Distractions * 2) - Limit 100
        const focusScore = Math.min(Math.max((totalMinutes / 240) * 100, 0), 100);

        res.json({
            focus_score: Math.round(focusScore),
            total_hours: (totalMinutes / 60).toFixed(1)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
