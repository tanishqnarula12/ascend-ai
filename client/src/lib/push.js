import api from '../services/api';

// VAPID public key — safe to ship in the client bundle, it's only used to
// identify this app to the push service, not to sign/decrypt anything.
const VAPID_PUBLIC_KEY = 'BNEZZgUz5aZmnw3Wx3rYQ0UhBtVmVyqlpt-IYnvirBKzPMhBgStK8a4eWYVEoE6niCt0ph7X7Ft1md1tSjPBlXA';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

export const isPushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window;

export const getPushSubscriptionState = async () => {
    if (!isPushSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? 'subscribed' : 'unsubscribed';
};

export const subscribeToPush = async () => {
    if (!isPushSupported()) throw new Error('Push notifications are not supported on this browser/device');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Notification permission denied');

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
    }
    await api.post('/push/subscribe', sub.toJSON());
    return sub;
};

export const unsubscribeFromPush = async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
        await api.post('/push/unsubscribe', { endpoint: sub.endpoint });
        await sub.unsubscribe();
    }
};
