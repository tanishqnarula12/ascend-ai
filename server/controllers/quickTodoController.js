import { query } from '../config/db.js';

// Auto-create the quick_todos table on server start — no manual migration needed.
// Only stores today's todos per user; date = CURRENT_DATE enforced at insert.
const ensureTable = async () => {
    await query(`
        CREATE TABLE IF NOT EXISTS quick_todos (
            id         SERIAL PRIMARY KEY,
            user_id    INTEGER NOT NULL,
            text       TEXT    NOT NULL,
            done       BOOLEAN NOT NULL DEFAULT FALSE,
            date       DATE    NOT NULL DEFAULT CURRENT_DATE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
};
ensureTable().catch(err => console.error('[QuickTodo] Table init failed:', err));

const todayRow = `id, text, done, to_char(date, 'YYYY-MM-DD') AS date`;

export const getTodos = async (req, res) => {
    try {
        const result = await query(
            `SELECT ${todayRow} FROM quick_todos
             WHERE user_id = $1 AND date = CURRENT_DATE
             ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[QuickTodo] getTodos:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createTodo = async (req, res) => {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Text is required' });
    try {
        const result = await query(
            `INSERT INTO quick_todos (user_id, text)
             VALUES ($1, $2)
             RETURNING ${todayRow}`,
            [req.user.id, text.trim()]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('[QuickTodo] createTodo:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const toggleTodo = async (req, res) => {
    try {
        const result = await query(
            `UPDATE quick_todos
             SET done = NOT done
             WHERE id = $1 AND user_id = $2
             RETURNING ${todayRow}`,
            [req.params.id, req.user.id]
        );
        if (!result.rows.length) return res.status(404).json({ message: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[QuickTodo] toggleTodo:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteTodo = async (req, res) => {
    try {
        await query(
            `DELETE FROM quick_todos WHERE id = $1 AND user_id = $2`,
            [req.params.id, req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('[QuickTodo] deleteTodo:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const clearCompleted = async (req, res) => {
    try {
        await query(
            `DELETE FROM quick_todos
             WHERE user_id = $1 AND done = TRUE AND date = CURRENT_DATE`,
            [req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('[QuickTodo] clearCompleted:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
