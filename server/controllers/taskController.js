import { query } from '../config/db.js';

export const getTasks = async (req, res) => {
    try {
        const tasks = await query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY due_date ASC', [req.user.id]);
        res.json(tasks.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createTask = async (req, res) => {
    const { goal_id, title, difficulty, due_date } = req.body;

    try {
        const newTask = await query(
            'INSERT INTO tasks (user_id, goal_id, title, difficulty, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, goal_id, title, difficulty, due_date]
        );
        res.status(201).json(newTask.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateTask = async (req, res) => {
    const { id } = req.params;
    const { title, is_completed, difficulty } = req.body;

    try {
        // If completed, update completed_at
        const completedAt = is_completed ? new Date() : null;

        const updatedTask = await query(
            `UPDATE tasks 
       SET title = COALESCE($1, title), 
           is_completed = COALESCE($2, is_completed), 
           difficulty = COALESCE($3, difficulty),
           completed_at = CASE WHEN $2 = true THEN NOW() ELSE completed_at END
       WHERE id = $4 AND user_id = $5 RETURNING *`,
            [title, is_completed, difficulty, id, req.user.id]
        );

        if (updatedTask.rows.length === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json(updatedTask.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteTask = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query('DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.json({ message: 'Task deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
