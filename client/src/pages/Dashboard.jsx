import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import RankModal from '../components/RankModal';
import { computeRank } from '../lib/rank';
import { motion } from 'framer-motion';
import { AlertCircle, TrendingUp, CheckCircle, BarChart3, Flame, Square, ListChecks, Plus, Circle, CheckCircle2, Trash2, ArrowRight, Brain, Sparkles, Activity, RefreshCw } from 'lucide-react';

const timeGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
};

const Dashboard = () => {
    const { currentUser } = useAuth();
    const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
    const [stats, setStats] = useState({
        completedTasks: 0,
        pendingTasks: 0,
        streak: 0,
        score: 0,
        focusAreas: [],
        consistencyScore: 0,
        consistencyTrend: 'stable',
        burnoutRisk: 'LOW',
        burnoutScore: 0,
        burnoutRecommendation: '',
        focusScore: 0,
        heatmapData: []
    });
    const [season, setSeason] = useState(null);
    const [insight, setInsight] = useState(null);
    const [motivation, setMotivation] = useState(null);
    const [graphData, setGraphData] = useState([]);
    const [weeklyHabits, setWeeklyHabits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastSynced, setLastSynced] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Quick To-Do widget state — backed by DB for cross-device sync
    const [todos, setTodos] = useState([]);
    const [todoInput, setTodoInput] = useState('');

    // Re-fetches only the AI-driven widgets with a forced cache bust.
    // Called manually (refresh button) and automatically on tab re-focus after 3+ min away.
    const refreshAiData = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await api.delete('/ai/cache');
            const [tasksRes, aiRes, motivationRes] = await Promise.all([
                api.get('/tasks?today=true').catch(() => null),
                api.get('/ai/insights?refresh=true').catch(() => null),
                api.get('/ai/motivation?refresh=true').catch(() => null),
            ]);
            if (tasksRes) {
                const tasks = tasksRes.data || [];
                const completed = tasks.filter(t => t.is_completed).length;
                setStats(prev => ({
                    ...prev,
                    completedTasks: completed,
                    pendingTasks: tasks.length - completed,
                }));
            }
            if (aiRes) setInsight(aiRes.data);
            if (motivationRes) setMotivation(motivationRes.data);
            setLastSynced(Date.now());
        } catch (e) {
            console.warn('[DASHBOARD] Refresh failed:', e);
        } finally {
            setIsRefreshing(false);
        }
    };

    const addTodo = async (e) => {
        e.preventDefault();
        const val = todoInput.trim();
        if (!val) return;
        setTodoInput('');
        try {
            const res = await api.post('/quick-todos', { text: val });
            setTodos(prev => [res.data, ...prev]);
        } catch { setTodoInput(val); }
    };
    const toggleTodo = async (id) => {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
        try {
            const res = await api.put(`/quick-todos/${id}/toggle`);
            setTodos(prev => prev.map(t => t.id === id ? res.data : t));
        } catch {
            setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
        }
    };
    const removeTodo = async (id) => {
        setTodos(prev => prev.filter(t => t.id !== id));
        api.delete(`/quick-todos/${id}`).catch(() => {});
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                console.log("[DASHBOARD] Fetching data from all components...");
                const [tasksRes, aiRes, analyticsRes, advAnalyticsRes, focusRes, motivationRes, habitsRes, todosRes, seasonRes] = await Promise.all([
                    api.get('/tasks?today=true').then(r => { console.log("Tasks loaded"); return r; }).catch(e => { console.warn("Tasks failed", e); return { data: [] }; }),
                    api.get('/ai/insights').then(r => { console.log("Insights loaded"); return r; }).catch(e => { console.warn("Insights failed", e); return { data: { insight: "AI Service unavailable", productivity_score: 0 } }; }),
                    api.get('/goals/analytics').then(r => { console.log("Analytics loaded"); return r; }).catch(e => { console.warn("Analytics failed", e); return { data: { graphData: [], streak: 0 } }; }),
                    api.get('/ai/advanced-analytics').then(r => { console.log("Adv Analytics loaded"); return r; }).catch(e => { console.warn("Adv Analytics failed", e); return { data: { consistency: { score: 0, trend: 'stable' }, burnout: { risk_level: 'LOW' }, heatmap: [] } }; }),
                    api.get('/ai/focus/stats').then(r => { console.log("Focus stats loaded"); return r; }).catch(e => { console.warn("Focus failed", e); return { data: { focus_score: 0, total_hours: 0 } }; }),
                    api.get('/ai/motivation').then(r => { console.log("Motivation loaded"); return r; }).catch(e => { console.warn("Motivation failed", e); return { data: { quote: "Your only limit is your mind.", author: "AscendAI" } }; }),
                    api.get('/tasks/habits/weekly').then(r => { console.log("Habits loaded"); return r; }).catch(e => { console.warn("Habits failed", e); return { data: [] }; }),
                    api.get('/quick-todos').catch(() => ({ data: [] })),
                    api.get('/season/current').then(r => { console.log("Season loaded"); return r; }).catch(e => { console.warn("Season failed", e); return { data: null }; })
                ]);

                const tasks = tasksRes?.data || [];
                const completed = tasks.filter(t => t.is_completed).length;
                const pending = tasks.length - completed;

                const analytics = analyticsRes?.data || { graphData: [], streak: 0, totalTasks: 0 };
                const adv = advAnalyticsRes?.data || { consistency: { score: 0 }, burnout: { risk_level: 'LOW' }, heatmap: [] };
                const focus = focusRes?.data || { focus_score: 0 };

                const totalCompleted = analytics.totalTasks || 0;
                const earnedBadges = [
                    true, // Pioneer
                    analytics.streak >= 3, // On Fire
                    totalCompleted >= 10, // Decimal Decimation
                    totalCompleted >= 1, // Titan
                    adv.consistency?.score >= 80, // Clockwork
                    focus.focus_score >= 90 // Zen State
                ].filter(Boolean).length;

                const seasonData = seasonRes?.data || null;

                setStats({
                    completedTasks: completed,
                    pendingTasks: pending,
                    totalTasks: totalCompleted,
                    seasonTasks: seasonData?.seasonTasksCompleted || 0,
                    seasonTodos: seasonData?.seasonTodosCompleted || 0,
                    streak: analytics.streak || 0,
                    score: completed * 10,
                    achievements: earnedBadges,
                    focusAreas: analytics.focusAreas || [],
                    consistencyScore: adv.consistency?.score || 0,
                    consistencyTrend: adv.consistency?.trend || 'stable',
                    burnoutRisk: adv.burnout?.risk_level || 'LOW',
                    burnoutScore: adv.burnout?.score || 0,
                    burnoutRecommendation: adv.burnout?.recommendation || '',
                    focusScore: focus.focus_score || 0,
                    heatmapData: adv.heatmap || []
                });
                setSeason(seasonData?.season || null);

                setGraphData(analytics.graphData && analytics.graphData.length > 0
                    ? analytics.graphData
                    : [
                        { name: 'Mon', completion: 0 },
                        { name: 'Tue', completion: 0 },
                        { name: 'Wed', completion: 0 },
                        { name: 'Thu', completion: 0 },
                        { name: 'Fri', completion: 0 },
                        { name: 'Sat', completion: 0 },
                        { name: 'Sun', completion: 0 },
                    ]
                );

                setInsight(aiRes?.data);
                setMotivation(motivationRes?.data);
                setWeeklyHabits(habitsRes?.data || []);
                setTodos(todosRes?.data || []);
                setLastSynced(Date.now());
                console.log("[DASHBOARD] Data loaded successfully");

            } catch (error) {
                console.error("[DASHBOARD] Critical Error:", error);
                setError("Failed to load dashboard data. Our AI sync might be slow, please refresh.");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // Auto-refresh: every 3 minutes while the tab is open, and immediately when
    // the user switches back to this tab after being away for 3+ minutes.
    useEffect(() => {
        const interval = setInterval(() => { refreshAiData(); }, 3 * 60 * 1000);
        const onVisible = () => {
            if (document.visibilityState === 'visible' && lastSynced && Date.now() - lastSynced > 3 * 60 * 1000) {
                refreshAiData();
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
    }, [lastSynced, isRefreshing]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles size={20} className="text-primary" />
                </div>
            </div>
            <div className="text-center">
                <p className="font-semibold text-foreground text-lg">Syncing your dashboard</p>
                <p className="text-sm text-muted-foreground mt-1">AscendAI is crunching your data…</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle size={28} className="text-destructive" />
            </div>
            <div>
                <p className="font-bold text-lg text-foreground">Something went wrong</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">{error}</p>
            </div>
            <button onClick={() => window.location.reload()} className="text-sm bg-primary text-primary-foreground px-5 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Retry
            </button>
        </div>
    );

    const hasData = stats.completedTasks > 0 || stats.pendingTasks > 0;
    const todosDone = todos.filter(t => t.done).length;
    const combinedDone = stats.completedTasks + todosDone;
    const combinedTotal = stats.completedTasks + stats.pendingTasks + todos.length;
    const hasTodayData = hasData || todos.length > 0;
    // Short weekday name (e.g. "Mon") to highlight today in the Momentum chain
    const todayShort = new Date().toLocaleDateString('en-US', { weekday: 'short' });

    // graphData is bucketed Mon→Sun; rotate it so the chain reads chronologically
    // and ENDS on today (the rightmost dot is always "today"). This matches the streak.
    const todayIdx = graphData.findIndex(d => d.name === todayShort);
    const momentumChain = todayIdx >= 0
        ? [...graphData.slice(todayIdx + 1), ...graphData.slice(0, todayIdx + 1)]
        : graphData;

    // Gamified rank/league derived from real activity (replaces meaningless badges)
    const rank = computeRank(stats);
    const RankIcon = rank.tier.icon;

    const weekDates = [];
    const now = new Date();
    // Normalize today for comparison
    const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    // Get Monday of current week
    const currentDay = now.getDay();
    const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        // local YYYY-MM-DD
        const dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        weekDates.push({ dateObj: d, dateStr });
    }

    const toggleHabit = async (habitId, dateStr) => {
        if (dateStr !== todayStr) return; // Disallow past or future completion natively
        try {
            await api.post(`/tasks/habits/${habitId}/toggle`, { date: dateStr });
            setWeeklyHabits(prev => prev.map(habit => {
                if (habit.id === habitId) {
                    const taskIndex = habit.tasks.findIndex(t => t.due_date.startsWith(dateStr));
                    const newTasks = [...habit.tasks];
                    if (taskIndex >= 0) {
                        newTasks[taskIndex] = { ...newTasks[taskIndex], is_completed: !newTasks[taskIndex].is_completed };
                    } else {
                        newTasks.push({ due_date: dateStr, is_completed: true, habit_id: habitId });
                    }
                    return { ...habit, tasks: newTasks };
                }
                return habit;
            }));
        } catch (error) {
            console.error("Failed to toggle habit");
        }
    };

    return (
        <div className="space-y-8 pb-12">
            {(stats.burnoutRisk === 'HIGH' || stats.burnoutRisk === 'SEVERE') && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl flex items-center gap-4 text-destructive"
                >
                    <AlertCircle size={24} />
                    <div>
                        <p className="font-bold">{stats.burnoutRisk === 'SEVERE' ? 'Severe' : 'High'} Burnout Risk Detected ({stats.burnoutScore}/100)</p>
                        <p className="text-sm">{stats.burnoutRecommendation || "You've been pushing hard. Consider reducing \"Hard\" tasks today to maintain long-term momentum."}</p>
                    </div>
                </motion.div>
            )}

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-1">{timeGreeting()}</p>
                    <h1 className="text-3xl font-bold tracking-tight">{currentUser?.username} 👋</h1>
                    <p className="text-muted-foreground mt-1">
                        {hasData ? "Here's your progress overview for today." : "Ready to start? Add your first task below."}
                    </p>
                </div>
            </header>

            {/* Daily Motivation Card — redesigned */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl border border-border bg-card"
            >
                {/* Subtle background orbs */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-purple-500/5 pointer-events-none" />
                <div className="absolute -top-16 -right-16 w-56 h-56 bg-orange-400/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6 p-7">
                    <div className="flex-shrink-0">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                            <Flame className="text-white fill-white" size={26} />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500 mb-2">Daily Motivation</p>
                        <blockquote className="text-xl md:text-2xl font-bold text-foreground leading-snug">
                            "{motivation?.quote || "The secret of getting ahead is getting started."}"
                        </blockquote>
                        <div className="mt-4 flex items-center gap-3">
                            <div className="h-px flex-1 bg-border" />
                            <cite className="text-sm font-semibold text-muted-foreground not-italic flex-shrink-0">
                                — {motivation?.author || "AscendAI Wisdom"}
                            </cite>
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">

                {/* Momentum — "don't break the chain" streak visualizer (1st position) */}
                <div className="relative h-full flex flex-col bg-card border border-border rounded-2xl p-6 overflow-hidden group hover:border-orange-500/40 transition-all duration-300">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 rounded-t-2xl" />
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-orange-500/5 rounded-full blur-xl group-hover:bg-orange-500/10 transition-all" />
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                                <Flame size={18} className="text-orange-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500">Momentum</p>
                                <p className="text-2xl font-bold leading-none mt-1">
                                    {stats.streak}
                                    <span className="text-sm font-medium text-muted-foreground ml-1.5">day{stats.streak === 1 ? '' : 's'} streak</span>
                                </p>
                            </div>
                        </div>

                        {/* 7-day chain — chronological, ends on today (rightmost) */}
                        <div className="flex items-center justify-between gap-1 mb-4">
                            {momentumChain.map((d, i) => {
                                const isToday = d.name === todayShort;
                                // Today's dot uses the authoritative live count so it always
                                // agrees with the "Today" card; past dots use historical data.
                                const count = isToday ? stats.completedTasks : d.completion;
                                const active = count > 0;
                                return (
                                    <div key={i} className="flex flex-col items-center gap-1.5">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500
                                            ${active
                                                ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-sm shadow-orange-500/30'
                                                : 'bg-secondary text-muted-foreground/40'}
                                            ${isToday ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-card' : ''}`}>
                                            {active ? count : ''}
                                        </div>
                                        <span className={`text-[9px] ${isToday ? 'text-orange-500 font-bold' : 'text-muted-foreground'}`}>{d.name?.[0]}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed mt-auto">
                            {stats.streak > 0
                                ? `🔥 You're on a ${stats.streak}-day roll — show up today to keep the chain alive.`
                                : "Finish one task today to ignite your streak. Tomorrow it compounds."}
                        </p>
                    </div>
                </div>

                {/* Consistency Score */}
                <div className="relative h-full flex flex-col bg-card border border-border rounded-2xl p-6 overflow-hidden group hover:border-indigo-500/40 transition-all duration-300">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 rounded-t-2xl" />
                    <div className="absolute -right-5 -bottom-5 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all" />
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                                <TrendingUp size={18} className="text-indigo-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-500">Consistency</p>
                                <p className="text-2xl font-bold leading-none mt-1">
                                    {stats.consistencyScore ?? 0}
                                    <span className="text-sm font-medium text-muted-foreground ml-1">/ 100</span>
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-auto">
                            {(stats.consistencyScore ?? 0) >= 70
                                ? "Rock solid. You're building an unbreakable habit loop."
                                : (stats.consistencyScore ?? 0) >= 40
                                    ? "Good momentum. Close more tasks daily to push this higher."
                                    : "Show up consistently — even small wins compound fast."}
                        </p>
                    </div>
                </div>

                {/* Rank / League — gamified grade (replaces badges) */}
                <div onClick={() => setIsBadgeModalOpen(true)} className={`relative h-full flex flex-col bg-card border border-border rounded-2xl p-6 overflow-hidden group cursor-pointer hover:border-primary/40 transition-all duration-300`}>
                    <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${rank.tier.from} ${rank.tier.to} rounded-t-2xl`} />
                    <div className={`absolute -right-5 -bottom-5 w-24 h-24 ${rank.tier.glow} rounded-full blur-xl group-hover:opacity-80 transition-all`} />
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${rank.tier.from} ${rank.tier.to} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                <RankIcon size={18} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <p className={`text-[11px] font-bold uppercase tracking-widest ${rank.tier.text}`}>League</p>
                                    {season && (
                                        <span className="text-[9px] font-bold uppercase bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                                            S{season.number}
                                        </span>
                                    )}
                                </div>
                                <p className="text-2xl font-bold leading-none mt-1">
                                    {rank.tier.name}
                                </p>
                            </div>
                        </div>
                        <div className="mt-auto">
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div className={`h-full bg-gradient-to-r ${rank.tier.from} ${rank.tier.to} rounded-full transition-all duration-700`} style={{ width: `${rank.progress}%` }} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 group-hover:text-foreground transition-colors">
                                {rank.next ? `${rank.pointsToNext.toLocaleString()} pts to ${rank.next.name} →` : 'Top league reached 🏆'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Today's Progress — tasks + to-dos combined */}
                <div className="relative h-full flex flex-col bg-card border border-border rounded-2xl p-6 overflow-hidden group hover:border-cyan-500/40 transition-all duration-300">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-t-2xl" />
                    <div className="absolute -right-5 -bottom-5 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition-all" />
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                                <CheckCircle size={18} className="text-cyan-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-500">Today</p>
                                <p className="text-2xl font-bold leading-none mt-1">
                                    {combinedDone}
                                    <span className="text-sm font-medium text-muted-foreground ml-1">
                                        / {combinedTotal} done
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div className="mt-auto">
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-700"
                                    style={{ width: `${hasTodayData ? Math.round((combinedDone / combinedTotal) * 100) : 0}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                {hasTodayData
                                    ? `${stats.completedTasks}/${stats.completedTasks + stats.pendingTasks} tasks · ${todosDone}/${todos.length} to-dos cleared`
                                    : "No tasks or to-dos yet — add one to start."}
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            {/* Quick To-Do Widget */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border">
                    <h3 className="text-base font-bold flex items-center gap-2">
                        <ListChecks size={18} className="text-primary" /> Quick To-Do
                        {todos.filter(t => !t.done).length > 0 && (
                            <span className="ml-1 text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                {todos.filter(t => !t.done).length}
                            </span>
                        )}
                    </h3>
                    <a href="/todo" className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                        See all <ArrowRight size={13} />
                    </a>
                </div>

                {/* Inline add form */}
                <form onSubmit={addTodo} className="flex items-center gap-2 px-6 py-3 border-b border-border/60">
                    <input
                        type="text"
                        value={todoInput}
                        onChange={e => setTodoInput(e.target.value)}
                        placeholder="Add a quick to-do…"
                        className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60"
                    />
                    <button
                        type="submit"
                        className="flex-shrink-0 bg-primary text-primary-foreground rounded-lg p-1.5 hover:bg-primary/90 transition-colors"
                        aria-label="Add"
                    >
                        <Plus size={16} />
                    </button>
                </form>

                {/* Todo list — shows up to 6 items, scrollable */}
                <div className="divide-y divide-border/50 max-h-[260px] overflow-y-auto">
                    {todos.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8 px-6">
                            Nothing here yet — add a to-do above!
                        </p>
                    ) : (
                        todos.slice(0, 10).map(todo => (
                            <div
                                key={todo.id}
                                className={`group flex items-center gap-3 px-6 py-3 transition-colors hover:bg-secondary/30 ${todo.done ? 'opacity-50' : ''}`}
                            >
                                <button
                                    onClick={() => toggleTodo(todo.id)}
                                    className={`flex-shrink-0 transition-colors ${todo.done ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                                    aria-label="Toggle"
                                >
                                    {todo.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                </button>
                                <p className={`flex-1 text-sm truncate ${todo.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                    {todo.text}
                                </p>
                                <button
                                    onClick={() => removeTodo(todo.id)}
                                    className="flex-shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Delete"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Progress bar at the bottom */}
                {todos.length > 0 && (
                    <div className="h-1 w-full bg-secondary">
                        <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${Math.round((todos.filter(t => t.done).length / todos.length) * 100)}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Weekly Habits Grid (Replaced Heatmap) */}
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm overflow-x-auto">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <CheckCircle className="text-green-500" size={20} /> Execution Board
                </h3>
                {weeklyHabits && weeklyHabits.length > 0 ? (
                    <div className="min-w-[600px]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-3 border-b border-border font-medium text-muted-foreground">Task ↴</th>
                                    {/* Generate current week headers */}
                                    {weekDates.map(({ dateObj }, index) => {
                                        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                                        return <th key={index} className="p-3 border-b border-border font-medium text-center text-muted-foreground">{dayName}</th>
                                    })}
                                    <th className="p-3 border-b border-border font-medium text-center text-muted-foreground">Progress</th>
                                </tr>
                            </thead>
                            <tbody>
                                {weeklyHabits.map((habit) => {
                                    const completedCount = weekDates.filter(({ dateStr }) => {
                                        const task = habit.tasks.find(t => t.due_date.startsWith(dateStr));
                                        return task && task.is_completed;
                                    }).length;
                                    const percentage = Math.round((completedCount / 7) * 100);

                                    return (
                                        <tr key={habit.id} className="hover:bg-secondary/20 transition-colors">
                                            <td className="p-3 border-b border-border font-semibold max-w-[200px] truncate" title={habit.title}>{habit.title}</td>
                                            {weekDates.map(({ dateStr }) => {
                                                const taskForDay = habit.tasks.find(t => t.due_date.startsWith(dateStr));
                                                const isNotToday = dateStr !== todayStr;

                                                return (
                                                    <td key={dateStr} className="p-3 border-b border-border text-center">
                                                        <button
                                                            onClick={() => toggleHabit(habit.id, dateStr)}
                                                            disabled={isNotToday}
                                                            className={`inline-flex items-center justify-center rounded-md p-1.5 transition-all outline-none ${isNotToday ? 'cursor-not-allowed' : 'hover:scale-110 cursor-pointer'}`}
                                                        >
                                                            {taskForDay ? (
                                                                taskForDay.is_completed ? (
                                                                    <div className="bg-green-500/10 text-green-500 rounded-md border border-green-500/20 shadow-sm p-1">
                                                                        <CheckCircle size={18} />
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-red-500/10 text-red-500 rounded-md border border-red-500/20 shadow-sm p-1">
                                                                        <AlertCircle size={18} />
                                                                    </div>
                                                                )
                                                            ) : dateStr < todayStr ? (
                                                                <div className="bg-red-500/10 text-red-500 rounded-md border border-red-500/20 shadow-sm p-1">
                                                                    <AlertCircle size={18} />
                                                                </div>
                                                            ) : (
                                                                <div className="bg-secondary/30 text-muted-foreground/50 rounded-md hover:text-foreground hover:bg-secondary/50 p-1">
                                                                    <Square size={18} strokeWidth={2} />
                                                                </div>
                                                            )}
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                            <td className="p-3 border-b border-border text-center align-middle w-16">
                                                <div className="relative inline-flex items-center justify-center -ml-1">
                                                    <svg className="w-8 h-8 transform -rotate-90">
                                                        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-secondary" />
                                                        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3" fill="transparent"
                                                            strokeDasharray="87.96"
                                                            strokeDashoffset={87.96 - (percentage / 100) * 87.96}
                                                            className={`transition-all duration-500 ease-in-out ${percentage === 100 ? 'text-green-500' : 'text-primary'}`} />
                                                    </svg>
                                                    {percentage === 100 && <CheckCircle size={10} className="absolute text-green-500 bg-card rounded-full" />}
                                                    {percentage < 100 && percentage > 0 && <span className="absolute text-[9px] font-bold text-primary">{percentage}%</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No permanent tasks active.</p>
                        <p className="text-sm">Create a 'Permanent Task' from the Daily Tasks page to track your weekly streak here.</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-card p-6 rounded-xl border border-border shadow-sm min-h-[400px]">
                    <h3 className="text-lg font-semibold mb-6">Weekly Performance</h3>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        {hasData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={graphData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'gray' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'gray' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                    />
                                    <Bar dataKey="completion" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <BarChart3 size={48} className="mx-auto mb-4 opacity-20" />
                                <p>No performance data available yet.</p>
                                <p className="text-sm">Complete your first task to see the magic!</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <BurnoutCard
                        level={stats.burnoutRisk}
                        score={stats.burnoutScore}
                        recommendation={stats.burnoutRecommendation}
                    />

                    {/* AI Insight — redesigned with productivity ring */}
                    <div className="relative bg-card border border-border rounded-xl p-6 overflow-hidden group hover:border-indigo-500/40 transition-all duration-300">
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-xl" />
                        <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all" />

                        <div className="relative z-10 flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                    <Brain size={16} className="text-indigo-500" />
                                </div>
                                <h3 className="font-bold text-foreground">AI Insight</h3>
                            </div>
                            {/* Circular productivity score */}
                            <div className="relative w-14 h-14 flex-shrink-0">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                                    <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="4" className="text-secondary" />
                                    <circle
                                        cx="28" cy="28" r="22" fill="none"
                                        stroke="url(#aiGrad)" strokeWidth="4" strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 22}`}
                                        strokeDashoffset={`${2 * Math.PI * 22 * (1 - (insight?.productivity_score || 0) / 100)}`}
                                        className="transition-all duration-700"
                                    />
                                    <defs>
                                        <linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#6366f1" />
                                            <stop offset="100%" stopColor="#a855f7" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                                    {insight?.productivity_score ?? 0}%
                                </span>
                            </div>
                        </div>

                        <p className="relative z-10 text-sm text-foreground/80 leading-relaxed mb-4">
                            {insight?.insight || (hasData ? "Analyzing your patterns..." : "Add tasks to unlock personalized AI insights.")}
                        </p>

                        <div className="relative z-10 flex items-center justify-between gap-2">
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                insight?.mood_trend === 'Improving' ? 'bg-green-500/10 text-green-500' :
                                insight?.mood_trend === 'Declining' ? 'bg-red-500/10 text-red-500' :
                                'bg-secondary text-muted-foreground'
                            }`}>
                                {insight?.mood_trend || 'Stable'}
                            </span>
                            <div className="flex items-center gap-2">
                                {lastSynced && (
                                    <span className="text-[10px] text-muted-foreground">
                                        {Math.floor((Date.now() - lastSynced) / 60000) < 1
                                            ? 'just now'
                                            : `${Math.floor((Date.now() - lastSynced) / 60000)}m ago`}
                                    </span>
                                )}
                                <button
                                    onClick={refreshAiData}
                                    disabled={isRefreshing}
                                    title="Refresh AI analysis with latest data"
                                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-indigo-500 transition-colors disabled:opacity-40"
                                >
                                    <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
                                    <Activity size={11} />
                                    {isRefreshing ? 'Syncing…' : 'AI Synced'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card p-6 rounded-xl border border-border">
                        <h3 className="text-lg font-semibold mb-4">Focus Areas</h3>
                        {stats.focusAreas && stats.focusAreas.length > 0 ? (
                            <ul className="space-y-3">
                                {stats.focusAreas.map((area, i) => (
                                    <li key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                                        <span className="text-sm font-medium">{area.name}</span>
                                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">Add goals with categories to see focus areas.</p>
                        )}
                    </div>
                </div>
            </div>
            <RankModal
                isOpen={isBadgeModalOpen}
                onClose={() => setIsBadgeModalOpen(false)}
                stats={{ ...stats, completedTodos: todosDone }}
                season={season}
            />
        </div>
    );
};

const BURNOUT_STYLES = {
    'LOW': { color: 'text-green-500', bar: 'bg-green-500', label: 'Low' },
    'MODERATE': { color: 'text-yellow-500', bar: 'bg-yellow-500', label: 'Moderate' },
    'HIGH': { color: 'text-orange-500', bar: 'bg-orange-500', label: 'High' },
    'SEVERE': { color: 'text-red-500', bar: 'bg-red-500', label: 'Severe' },
};

const BurnoutCard = ({ level, score = 0, recommendation }) => {
    const inactive = !level || level.startsWith('N/A');
    const style = BURNOUT_STYLES[level] || { color: 'text-muted-foreground', bar: 'bg-muted-foreground', label: 'Inactive' };
    const width = inactive ? 0 : Math.max(4, Math.min(100, score));

    return (
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Flame size={16} className={inactive ? 'text-muted-foreground' : style.color} /> Burnout Risk
                </h3>
                <span className={`text-xs font-bold px-2 py-1 rounded-full bg-secondary ${inactive ? 'text-muted-foreground' : style.color}`}>
                    {inactive ? 'Inactive' : `${style.label} · ${score}/100`}
                </span>
            </div>
            <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden mb-3">
                <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${inactive ? 'bg-muted-foreground/30' : style.bar}`}
                    style={{ width: `${width}%` }}
                ></div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
                {inactive
                    ? 'Log a few tasks so we can read your workload.'
                    : (recommendation || "You're well balanced right now — keep your current rhythm.")}
            </p>
        </div>
    );
};

export default Dashboard;
