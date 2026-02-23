import { query } from '../config/db.js';
import { updateGoalProgress } from './goalController.js';

export const getTasks = async (req, res) => {
    const { today } = req.query;
    try {
        let queryStr = 'SELECT * FROM tasks WHERE user_id = $1';
        let params = [req.user.id];

        if (today === 'true') {
            queryStr += ' AND due_date = CURRENT_DATE';
        }

        queryStr += ' ORDER BY created_at ASC';
        const tasks = await query(queryStr, params);
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
            [req.user.id, goal_id, title, difficulty, due_date || new Date()]
        );

        if (goal_id) {
            await updateGoalProgress(goal_id, req.user.id);
        }

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
        const previousTaskRes = await query('SELECT goal_id, is_completed FROM tasks WHERE id = $1', [id]);
        if (previousTaskRes.rows.length === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }
        const previousTask = previousTaskRes.rows[0];

        const updatedTask = await query(
            `UPDATE tasks 
       SET title = COALESCE($1, title), 
           is_completed = COALESCE($2, is_completed), 
           difficulty = COALESCE($3, difficulty),
           goal_id = COALESCE($4, goal_id),
           completed_at = CASE 
               WHEN $2 IS NULL THEN completed_at
               WHEN $2 = true THEN NOW() 
               ELSE NULL 
           END
       WHERE id = $5 AND user_id = $6 RETURNING *`,
            [title, is_completed, difficulty, req.body.goal_id, id, req.user.id]
        );

        if (updatedTask.rows.length === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const task = updatedTask.rows[0];

        // Update current goal
        if (task.goal_id) {
            await updateGoalProgress(task.goal_id, req.user.id);
        }
        // Update old goal if it changed
        if (previousTask.goal_id && previousTask.goal_id !== task.goal_id) {
            await updateGoalProgress(previousTask.goal_id, req.user.id);
        }

        // Award XP if JUST completed
        if (is_completed === true && previousTask.is_completed === false) {
            let xpAmt = 10;
            if (task.difficulty === 'medium') xpAmt = 25;
            if (task.difficulty === 'hard') xpAmt = 60;

            await query('UPDATE users SET xp = xp + $1 WHERE id = $2', [xpAmt, req.user.id]);

            // Level up check
            const user = await query('SELECT xp, level FROM users WHERE id = $1', [req.user.id]);
            const nextLevelXP = user.rows[0].level * 500;
            if (user.rows[0].xp >= nextLevelXP) {
                await query('UPDATE users SET level = level + 1 WHERE id = $1', [req.user.id]);
            }
        }

        res.json(task);
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

        const task = result.rows[0];
        if (task.goal_id) {
            await updateGoalProgress(task.goal_id, req.user.id);
        }

        res.json({ message: 'Task deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


