import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, BellOff, Plus, Trash2, Loader2, CheckCircle2, Clock } from 'lucide-react';
import api from '../services/api';
import { isPushSupported, getPushSubscriptionState, subscribeToPush, unsubscribeFromPush } from '../lib/push';

const toLocalInputValue = (date) => {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
};

const Reminders = () => {
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [remindAt, setRemindAt] = useState(() => toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
    const [pushState, setPushState] = useState('checking');
    const [isToggling, setIsToggling] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/reminders').then(r => setReminders(r.data)).catch(() => setReminders([])).finally(() => setLoading(false));
        if (isPushSupported()) {
            getPushSubscriptionState().then(setPushState).catch(() => setPushState('unsupported'));
        } else {
            setPushState('unsupported');
        }
    }, []);

    const handleEnableNotifications = async () => {
        setIsToggling(true);
        setError('');
        try {
            await subscribeToPush();
            setPushState('subscribed');
        } catch (e) {
            setError(e.message || 'Could not enable notifications');
            setPushState(Notification.permission === 'denied' ? 'denied' : 'unsubscribed');
        } finally {
            setIsToggling(false);
        }
    };

    const handleDisableNotifications = async () => {
        setIsToggling(true);
        try {
            await unsubscribeFromPush();
            setPushState('unsubscribed');
        } finally {
            setIsToggling(false);
        }
    };

    const addReminder = async (e) => {
        e.preventDefault();
        const msg = message.trim();
        if (!msg || !remindAt) return;
        setError('');
        try {
            const res = await api.post('/reminders', { message: msg, remind_at: new Date(remindAt).toISOString() });
            setReminders(prev => [...prev, res.data].sort((a, b) => new Date(a.remind_at) - new Date(b.remind_at)));
            setMessage('');
        } catch {
            setError('Could not create reminder');
        }
    };

    const removeReminder = async (id) => {
        setReminders(prev => prev.filter(r => r.id !== id));
        api.delete(`/reminders/${id}`).catch(() => {});
    };

    const upcoming = reminders.filter(r => !r.sent);
    const past = reminders.filter(r => r.sent);

    const statusCopy = {
        subscribed: { title: 'Notifications enabled', hint: 'Required so reminders can reach you outside the app.' },
        denied: { title: 'Notifications blocked', hint: 'Allow notifications for this site in your browser settings to use reminders.' },
        unsupported: { title: 'Not supported on this browser', hint: 'Try installing the app to your home screen first.' },
        unsubscribed: { title: 'Notifications are off', hint: 'Required so reminders can reach you outside the app.' },
        checking: { title: 'Checking…', hint: '' },
    };
    const status = statusCopy[pushState] || statusCopy.unsubscribed;

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Bell className="text-primary" /> Reminders
                </h1>
                <p className="text-muted-foreground mt-1">Get a push notification at the time you choose — even if the app is closed.</p>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    {pushState === 'subscribed' ? <BellRing className="text-green-500 flex-shrink-0" size={22} /> : <BellOff className="text-muted-foreground flex-shrink-0" size={22} />}
                    <div>
                        <p className="font-semibold">{status.title}</p>
                        {status.hint && <p className="text-xs text-muted-foreground mt-0.5">{status.hint}</p>}
                    </div>
                </div>
                {pushState !== 'unsupported' && pushState !== 'denied' && pushState !== 'checking' && (
                    <button
                        onClick={pushState === 'subscribed' ? handleDisableNotifications : handleEnableNotifications}
                        disabled={isToggling}
                        className={`flex-shrink-0 px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 ${pushState === 'subscribed'
                            ? 'bg-secondary text-foreground hover:bg-secondary/70'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                    >
                        {isToggling ? 'Working…' : pushState === 'subscribed' ? 'Disable' : 'Enable Notifications'}
                    </button>
                )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <form onSubmit={addReminder} className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Remind me to…"
                    className="flex-1 bg-transparent border-none focus:ring-0 text-base placeholder:text-muted-foreground"
                />
                <input
                    type="datetime-local"
                    value={remindAt}
                    onChange={(e) => setRemindAt(e.target.value)}
                    className="bg-secondary/50 rounded-lg px-3 py-2 text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 font-semibold text-sm flex-shrink-0">
                    <Plus size={16} /> Add
                </button>
            </form>

            <div className="space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="text-sm">Loading reminders…</span>
                    </div>
                ) : reminders.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Bell size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No reminders yet — add one above!</p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {upcoming.map((r) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={r.id}
                                className="group flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <Clock size={18} className="text-primary flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{r.message}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(r.remind_at).toLocaleString()}</p>
                                    </div>
                                </div>
                                <button onClick={() => removeReminder(r.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-2" aria-label="Delete reminder">
                                    <Trash2 size={18} />
                                </button>
                            </motion.div>
                        ))}

                        {past.length > 0 && (
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground pt-4">Past</p>
                        )}
                        {past.map((r) => (
                            <motion.div
                                layout
                                key={r.id}
                                className="group flex items-center justify-between p-4 rounded-xl border border-transparent bg-secondary/30 opacity-60"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <CheckCircle2 size={18} className="text-muted-foreground flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-medium truncate line-through">{r.message}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(r.remind_at).toLocaleString()}</p>
                                    </div>
                                </div>
                                <button onClick={() => removeReminder(r.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-2" aria-label="Delete reminder">
                                    <Trash2 size={18} />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default Reminders;
