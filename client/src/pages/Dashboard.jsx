import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Heatmap from '../components/Heatmap';
import BadgeModal from '../components/BadgeModal';
import { motion } from 'framer-motion';
import { AlertCircle, Zap, TrendingUp, CheckCircle, Award, BarChart3, Clock, Flame } from 'lucide-react';

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
        focusScore: 0,
        heatmapData: []
    });
    const [insight, setInsight] = useState(null);
    const [briefing, setBriefing] = useState(null);
    const [motivation, setMotivation] = useState(null);
    const [graphData, setGraphData] = useState([]);
    const [weeklyHabits, setWeeklyHabits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                console.log("[DASHBOARD] Fetching data from all components...");
                const [tasksRes, aiRes, analyticsRes, briefingRes, advAnalyticsRes, focusRes, motivationRes, habitsRes] = await Promise.all([
                    api.get('/tasks?today=true').then(r => { console.log("Tasks loaded"); return r; }).catch(e => { console.warn("Tasks failed", e); return { data: [] }; }),
                    api.get('/ai/insights').then(r => { console.log("Insights loaded"); return r; }).catch(e => { console.warn("Insights failed", e); return { data: { insight: "AI Service unavailable", productivity_score: 0 } }; }),
                    api.get('/goals/analytics').then(r => { console.log("Analytics loaded"); return r; }).catch(e => { console.warn("Analytics failed", e); return { data: { graphData: [], streak: 0 } }; }),
                    api.get('/ai/briefing').then(r => { console.log("Briefing loaded"); return r; }).catch(e => { console.warn("Briefing failed", e); return { data: { briefing: "Focus on your goals today." } }; }),
                    api.get('/ai/advanced-analytics').then(r => { console.log("Adv Analytics loaded"); return r; }).catch(e => { console.warn("Adv Analytics failed", e); return { data: { consistency: { score: 0, trend: 'stable' }, burnout: { risk_level: 'LOW' }, heatmap: [] } }; }),
                    api.get('/ai/focus/stats').then(r => { console.log("Focus stats loaded"); return r; }).catch(e => { console.warn("Focus failed", e); return { data: { focus_score: 0, total_hours: 0 } }; }),
                    api.get('/ai/motivation').then(r => { console.log("Motivation loaded"); return r; }).catch(e => { console.warn("Motivation failed", e); return { data: { quote: "Your only limit is your mind.", author: "AscendAI" } }; }),
                    api.get('/tasks/habits/weekly').then(r => { console.log("Habits loaded"); return r; }).catch(e => { console.warn("Habits failed", e); return { data: [] }; })
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

                setStats({
                    completedTasks: completed,
                    pendingTasks: pending,
                    totalTasks: totalCompleted,
                    streak: analytics.streak || 0,
                    score: completed * 10,
                    achievements: earnedBadges,
                    focusAreas: analytics.focusAreas || [],
                    consistencyScore: adv.consistency?.score || 0,
                    consistencyTrend: adv.consistency?.trend || 'stable',
                    burnoutRisk: adv.burnout?.risk_level || 'LOW',
                    focusScore: focus.focus_score || 0,
                    heatmapData: adv.heatmap || []
                });

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
                setBriefing(briefingRes?.data);
                setMotivation(motivationRes?.data);
                setWeeklyHabits(habitsRes?.data || []);
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

    if (loading) return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Loading your progress...</h2>
        </div>
    );

    if (error) return (
        <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>
            <h2>Error</h2>
            <p>{error}</p>
        </div>
    );

    const hasData = stats.completedTasks > 0 || stats.pendingTasks > 0;

    return (
        <div className="space-y-8 pb-12">
            {stats.burnoutRisk === 'HIGH' && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl flex items-center gap-4 text-destructive"
                >
                    <AlertCircle size={24} />
                    <div>
                        <p className="font-bold">High Burnout Risk Detected</p>
                        <p className="text-sm">You've been pushing hard. Consider reducing "Hard" tasks today to maintain long-term momentum.</p>
                    </div>
                </motion.div>
            )}

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome back, {currentUser?.username}</h1>
                    <p className="text-muted-foreground mt-1 text-lg">
                        {hasData ? "Great to see you again. Here is your progress." : "Ready to start your journey? Add some tasks to begin."}
                    </p>
                </div>
            </header>

            {/* Daily Motivation Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 border border-primary/20 p-8 rounded-3xl"
            >
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Zap size={120} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                    <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl">
                        <Flame className="text-orange-500 fill-orange-500" size={32} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-1">Daily Motivation</h2>
                        <blockquote className="text-xl md:text-2xl font-semibold italic text-foreground leading-relaxed">
                            "{motivation?.quote || "The secret of getting ahead is getting started."}"
                        </blockquote>
                        <cite className="block mt-2 text-sm font-medium text-muted-foreground">— {motivation?.author || "AscendAI Wisdom"}</cite>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            title="Daily Streak"
                            value={`${stats.streak} Days`}
                            icon={TrendingUp}
                            trend="Consistency"
                            color="text-green-500"
                        />
                        <div onClick={() => setIsBadgeModalOpen(true)} className="cursor-pointer group">
                            <StatCard
                                title="Badges"
                                value={stats.achievements || 0}
                                icon={Award}
                                trend="View Collection"
                                color="text-purple-500"
                            />
                        </div>
                        <StatCard
                            title="Total Progress"
                            value={hasData ? `${Math.round((stats.completedTasks / (stats.completedTasks + stats.pendingTasks)) * 100)}%` : "0%"}
                            icon={CheckCircle}
                            trend="Completed"
                            color="text-blue-500"
                        />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-primary/10 to-indigo-500/10 border border-primary/20 p-6 rounded-2xl shadow-inner relative overflow-hidden group hover:shadow-lg transition-all">
                    <div className="absolute -right-4 -top-4 bg-primary/5 w-24 h-24 rounded-full blur-2xl group-hover:bg-primary/20 transition-all"></div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                        <Zap size={14} className="fill-primary" /> Today's Game Plan
                    </h3>
                    <p className="text-sm font-semibold leading-relaxed text-foreground/90">
                        {briefing?.briefing || "Calculate your path to success."}
                    </p>
                </div>
            </div>

            {/* Weekly Habits Grid (Replaced Heatmap) */}
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm overflow-x-auto">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <CheckCircle className="text-green-500" size={20} /> Permanent Task Tracker
                </h3>
                {weeklyHabits && weeklyHabits.length > 0 ? (
                    <div className="min-w-[600px]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-3 border-b border-border font-medium text-muted-foreground">Task ↴</th>
                                    {/* Generate last 7 days headers */}
                                    {[6, 5, 4, 3, 2, 1, 0].map(daysAgo => {
                                        const d = new Date();
                                        d.setDate(d.getDate() - daysAgo);
                                        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                                        return <th key={daysAgo} className="p-3 border-b border-border font-medium text-center text-muted-foreground">{dayName}</th>
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {weeklyHabits.map((habit) => (
                                    <tr key={habit.id} className="hover:bg-secondary/20 transition-colors">
                                        <td className="p-3 border-b border-border font-semibold max-w-[200px] truncate">{habit.title}</td>
                                        {[6, 5, 4, 3, 2, 1, 0].map(daysAgo => {
                                            const d = new Date();
                                            d.setDate(d.getDate() - daysAgo);
                                            const dateStr = d.toISOString().split('T')[0];
                                            const taskForDay = habit.tasks.find(t => t.due_date.startsWith(dateStr));

                                            return (
                                                <td key={daysAgo} className="p-3 border-b border-border text-center">
                                                    {taskForDay ? (
                                                        taskForDay.is_completed ? (
                                                            <div className="inline-flex bg-green-500/10 text-green-500 p-1.5 rounded-md border border-green-500/20 shadow-sm">
                                                                <CheckCircle size={18} />
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex bg-red-500/10 text-red-500 p-1.5 rounded-md border border-red-500/20 shadow-sm">
                                                                <AlertCircle size={18} />
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="inline-flex bg-secondary/50 text-muted-foreground p-1.5 rounded-md">
                                                            <span className="w-4 h-4 block blur-[1px] opacity-20 outline outline-1 outline-offset-2 outline-border rounded-sm"></span>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
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
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl shadow-lg text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
                                <Zap className="fill-current text-yellow-300" /> AI Insight
                            </h3>
                            <p className="text-indigo-100 leading-relaxed">
                                {hasData
                                    ? (insight?.insight || "Analyzing your patterns...")
                                    : "I'll start providing insights once you've logged your first few tasks and goals."}
                            </p>
                            <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center">
                                <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded">
                                    Productivity: {(hasData && insight?.productivity_score > 0) ? `${insight.productivity_score}%` : "Analyzing..."}
                                </span>
                                <span className="text-xs text-indigo-200">AI Synced</span>
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
            <BadgeModal
                isOpen={isBadgeModalOpen}
                onClose={() => setIsBadgeModalOpen(false)}
                stats={stats}
            />
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, trend, color }) => (
    <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-2 rounded-lg bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
                <Icon className={color} size={24} />
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full">{trend}</span>
        </div>
        <div>
            <h4 className="text-muted-foreground text-sm font-medium">{title}</h4>
            <div className="text-2xl font-bold mt-1 text-foreground">{value}</div>
        </div>
    </div>
);

export default Dashboard;
