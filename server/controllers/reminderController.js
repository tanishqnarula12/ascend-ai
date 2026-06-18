import webpush from 'web-push';
import { query } from '../config/db.js';

const ensureTable = async () => {
    await query(`
        CREATE TABLE IF NOT EXISTS reminders (
            id         SERIAL PRIMARY KEY,
            user_id    INTEGER NOT NULL,
            message    TEXT NOT NULL,
            remind_at  TIMESTAMPTZ NOT NULL,
            sent       BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
};
ensureTable().catch(err => console.error('[Reminders] Table init failed:', err));

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:tanishqnarula60@gmail.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
} else {
    console.warn('[Reminders] VAPID keys not set — push notifications will not be sent.');
}

export const listReminders = async (req, res) => {
    try {
        const result = await query(
            'SELECT id, message, remind_at, sent FROM reminders WHERE user_id = $1 ORDER BY remind_at ASC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[Reminders] list:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createReminder = async (req, res) => {
    const { message, remind_at } = req.body;
    if (!message?.trim() || !remind_at) {
        return res.status(400).json({ message: 'message and remind_at are required' });
    }
    try {
        const result = await query(
            'INSERT INTO reminders (user_id, message, remind_at) VALUES ($1, $2, $3) RETURNING id, message, remind_at, sent',
            [req.user.id, message.trim(), remind_at]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('[Reminders] create:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteReminder = async (req, res) => {
    try {
        await query('DELETE FROM reminders WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('[Reminders] delete:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Sends a push to every subscription a user holds (multiple devices), pruning
// subscriptions the browser has revoked (404/410 from the push service).
const deliverToUser = async (userId, payload) => {
    const subsRes = await query('SELECT id, subscription FROM push_subscriptions WHERE user_id = $1', [userId]);
    let delivered = 0;
    for (const sub of subsRes.rows) {
        try {
            await webpush.sendNotification(sub.subscription, JSON.stringify(payload));
            delivered++;
        } catch (err) {
            if (err.statusCode === 404 || err.statusCode === 410) {
                await query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
            } else {
                console.error('[Reminders] push send failed:', err.message);
            }
        }
    }
    return delivered;
};

// Finds due, unsent reminders and pushes them. Called both by an internal
// timer (best-effort while the server happens to be awake) and by an external
// cron pinger hitting POST /api/reminders/check (the reliable path, since
// Render's free tier sleeps the server when idle and the internal timer can't
// fire while asleep).
export const runDueReminders = async () => {
    const dueRes = await query(`SELECT id, user_id, message FROM reminders WHERE sent = false AND remind_at <= NOW()`);
    let delivered = 0;
    for (const reminder of dueRes.rows) {
        delivered += await deliverToUser(reminder.user_id, {
            title: 'AscendAI Reminder',
            body: reminder.message,
            url: '/reminders',
        });
        await query('UPDATE reminders SET sent = true WHERE id = $1', [reminder.id]);
    }
    return { checked: dueRes.rows.length, delivered };
};

export const checkReminders = async (req, res) => {
    const secret = req.headers['x-cron-secret'];
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const result = await runDueReminders();
        res.json(result);
    } catch (err) {
        console.error('[Reminders] checkReminders:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
