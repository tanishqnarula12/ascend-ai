import webpush from 'web-push';
import { query } from '../config/db.js';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:tanishqnarula60@gmail.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
} else {
    console.warn('[Push] VAPID keys not set — push notifications will not be sent.');
}

// Sends a push to every subscription a user holds (multiple devices), pruning
// subscriptions the browser has revoked (404/410 from the push service).
export const sendPushToUser = async (userId, payload) => {
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
                console.error('[Push] send failed:', err.message);
            }
        }
    }
    return delivered;
};
