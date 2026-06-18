import { query } from '../config/db.js';

const ensureTable = async () => {
    await query(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id           SERIAL PRIMARY KEY,
            user_id      INTEGER NOT NULL,
            endpoint     TEXT NOT NULL UNIQUE,
            subscription JSONB NOT NULL,
            created_at   TIMESTAMPTZ DEFAULT NOW()
        )
    `);
};
ensureTable().catch(err => console.error('[Push] Table init failed:', err));

export const subscribe = async (req, res) => {
    const subscription = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ message: 'Invalid subscription' });
    try {
        await query(
            `INSERT INTO push_subscriptions (user_id, endpoint, subscription)
             VALUES ($1, $2, $3)
             ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, subscription = EXCLUDED.subscription`,
            [req.user.id, subscription.endpoint, subscription]
        );
        res.status(201).json({ success: true });
    } catch (err) {
        console.error('[Push] subscribe:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const unsubscribe = async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ message: 'endpoint required' });
    try {
        await query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [req.user.id, endpoint]);
        res.json({ success: true });
    } catch (err) {
        console.error('[Push] unsubscribe:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
