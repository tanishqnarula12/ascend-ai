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
