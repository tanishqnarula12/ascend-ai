import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { isPushSupported, getPushSubscriptionState, subscribeToPush, unsubscribeFromPush } from '../lib/push';

const NotificationBell = () => {
    const [state, setState] = useState('checking');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (isPushSupported()) {
            getPushSubscriptionState().then(setState).catch(() => setState('unsupported'));
        } else {
            setState('unsupported');
        }
    }, []);

    if (state === 'unsupported' || state === 'checking') return null;

    const handleClick = async () => {
        if (busy) return;
        setBusy(true);
        try {
            if (state === 'subscribed') {
                await unsubscribeFromPush();
                setState('unsubscribed');
            } else if (state !== 'denied') {
                await subscribeToPush();
                setState('subscribed');
            }
        } catch {
            setState(Notification.permission === 'denied' ? 'denied' : 'unsubscribed');
        } finally {
            setBusy(false);
        }
    };

    const title = state === 'subscribed'
        ? 'Notifications on — click to turn off'
        : state === 'denied'
            ? 'Notifications blocked in browser settings'
            : 'Turn on notifications';

    return (
        <button
            onClick={handleClick}
            disabled={busy || state === 'denied'}
            title={title}
            aria-label={title}
            className={`relative flex items-center justify-center w-10 h-10 rounded-full border border-border bg-card shadow-sm transition-all hover:shadow-md disabled:opacity-50 ${state === 'subscribed' ? 'text-primary hover:border-primary/50' : 'text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}
        >
            {state === 'subscribed' ? <Bell size={18} /> : <BellOff size={18} />}
            {state === 'subscribed' && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-500" />
            )}
        </button>
    );
};

export default NotificationBell;
