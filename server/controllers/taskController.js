import { query } from '../config/db.js';
import { updateGoalProgress } from './goalController.js';

export const getTasks = async (req, res) => {
    const { today } = req.query;
    try {
        let queryStr = 'SELECT * FROM tasks WHERE user_id = $1';
        let params = [req.user.id];

        if (today === 'true') {
            // Auto-spawn today's habits
            await query(`
                INSERT INTO tasks (user_id, habit_id, goal_id, title, type, difficulty, due_date)
                SELECT h.user_id, h.id, h.goal_id, h.title, 'permanent', h.difficulty, CURRENT_DATE
                FROM habits h
                WHERE h.user_id = $1
                AND NOT EXISTS (
                    SELECT 1 FROM tasks t 
                    WHERE t.habit_id = h.id AND t.due_date = CURRENT_DATE
                )
            `, [req.user.id]);

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
    const { goal_id, title, difficulty, due_date, type } = req.body;
    const taskType = type === 'permanent' ? 'permanent' : 'temporary';

    try {
        let habitId = null;

        if (taskType === 'permanent') {
            const habitRes = await query(
                'INSERT INTO habits (user_id, title, difficulty, goal_id) VALUES ($1, $2, $3, $4) RETURNING id',
                [req.user.id, title, difficulty, goal_id || null]
            );
            habitId = habitRes.rows[0].id;
        }

        const newTask = await query(
            'INSERT INTO tasks (user_id, goal_id, habit_id, title, type, difficulty, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [req.user.id, goal_id || null, habitId, title, taskType, difficulty, due_date || new Date()]
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

        // XP logic removed per user request
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

export const getWeeklyHabits = async (req, res) => {
    try {
        const habitsRes = await query('SELECT id, title FROM habits WHERE user_id = $1 ORDER BY created_at ASC', [req.user.id]);

        const tasksRes = await query(
            `SELECT habit_id, due_date::text, is_completed, id 
             FROM tasks 
             WHERE user_id = $1 AND type = 'permanent' AND due_date >= CURRENT_DATE - INTERVAL '6 days'
             ORDER BY due_date ASC`,
            [req.user.id]
        );

        const matrix = habitsRes.rows.map(habit => {
            const habitTasks = tasksRes.rows.filter(t => t.habit_id === habit.id);
            return {
                ...habit,
                tasks: habitTasks
            };
        });

        res.json(matrix);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error loading weekly grid' });
    }
};

