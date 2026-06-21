import { query } from '../config/db.js';
import { sendPushToUser } from '../utils/push.js';

const NUDGE_INTERVAL_HOURS = 3;

const ensureTable = async () => {
    await query(`
        CREATE TABLE IF NOT EXISTS nudge_state (
            user_id         INTEGER PRIMARY KEY,
            last_notified_at TIMESTAMPTZ
        )
    `);
};
ensureTable().catch(err => console.error('[Notifications] Table init failed:', err));

const hasPendingWork = async (userId) => {
    const result = await query(
        `SELECT
            EXISTS(SELECT 1 FROM tasks WHERE user_id = $1 AND due_date = CURRENT_DATE AND is_completed = false) AS has_tasks,
            EXISTS(SELECT 1 FROM quick_todos WHERE user_id = $1 AND date = CURRENT_DATE AND done = false) AS has_todos`,
        [userId]
    );
    const { has_tasks, has_todos } = result.rows[0];
    return has_tasks || has_todos;
};

// For every user with an active push subscription, sends a generic "you have
// pending tasks" nudge once every NUDGE_INTERVAL_HOURS, but only if they
// actually have unfinished work today. Called both by an internal timer
// (best-effort while the server happens to be awake) and by an external cron
// pinger hitting POST /api/notifications/check (the reliable path, since
// Render's free tier sleeps the server when idle and the internal timer can't
// fire while asleep).
export const runDueNudges = async () => {
    const usersRes = await query(`
        SELECT DISTINCT ps.user_id, ns.last_notified_at
        FROM push_subscriptions ps
        LEFT JOIN nudge_state ns ON ns.user_id = ps.user_id
    `);

    let checked = 0;
    let delivered = 0;

    for (const { user_id, last_notified_at } of usersRes.rows) {
        const dueForNudge = !last_notified_at ||
            (Date.now() - new Date(last_notified_at).getTime()) >= NUDGE_INTERVAL_HOURS * 60 * 60 * 1000;
        if (!dueForNudge) continue;

        checked++;
        if (!(await hasPendingWork(user_id))) continue;

        const sent = await sendPushToUser(user_id, {
            title: 'AscendAI',
            body: 'You have pending tasks waiting — tap to open AscendAI.',
            url: '/dashboard',
        });
        if (sent > 0) delivered++;

        await query(
            `INSERT INTO nudge_state (user_id, last_notified_at) VALUES ($1, NOW())
             ON CONFLICT (user_id) DO UPDATE SET last_notified_at = NOW()`,
            [user_id]
        );
    }

    return { checked, delivered };
};

export const checkNudges = async (req, res) => {
    const secret = req.headers['x-cron-secret'];
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const result = await runDueNudges();
        res.json(result);
    } catch (err) {
        console.error('[Notifications] checkNudges:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
