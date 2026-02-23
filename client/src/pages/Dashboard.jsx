import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Heatmap from '../components/Heatmap';
import { AlertCircle, Zap, TrendingUp, CheckCircle, Award, BarChart3, Clock, Flame } from 'lucide-react';

const Dashboard = () => {
    const { currentUser } = useAuth();
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
    const [graphData, setGraphData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                console.log("[DASHBOARD] Fetching data...");
                const [tasksRes, aiRes, analyticsRes, briefingRes, advAnalyticsRes, focusRes] = await Promise.all([
                    api.get('/tasks?today=true').catch(e => ({ data: [] })),
                    api.get('/ai/insights').catch(e => ({ data: { insight: "AI Service unavailable", productivity_score: 0 } })),
                    api.get('/goals/analytics').catch(e => ({ data: { graphData: [], streak: 0 } })),
                    api.get('/ai/briefing').catch(e => ({ data: { briefing: "Focus on your goals today." } })),
                    api.get('/ai/advanced-analytics').catch(e => ({ data: { consistency: { score: 0, trend: 'stable' }, burnout: { risk_level: 'LOW' }, heatmap: [] } })),
                    api.get('/ai/focus/stats').catch(e => ({ data: { focus_score: 0, total_hours: 0 } }))
                ]);

                const tasks = tasksRes.data || [];
                const completed = tasks.filter(t => t.is_completed).length;
                const pending = tasks.length - completed;

                const analytics = analyticsRes.data;
                const adv = advAnalyticsRes.data;
                const focus = focusRes.data;

                setStats({
                    completedTasks: completed,
                    pendingTasks: pending,
                    streak: analytics.streak || 0,
                    score: completed * 10,
                    achievements: Math.floor(completed / 5),
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

                setInsight(aiRes.data);
                setBriefing(briefingRes.data);
                console.log("[DASHBOARD] Data loaded successfully");

            } catch (error) {
                console.error("[DASHBOARD] Error fetching dashboard data", error);
                setError("Failed to load dashboard data. Please try again.");
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

            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome back, {currentUser?.username}</h1>
                    <p className="text-muted-foreground mt-1">
                        {hasData ? "Here's your daily evolution report." : "Ready to start your journey? Add some tasks to begin."}
                    </p>
                </div>

                <div className="w-full md:w-64 bg-card border border-border p-4 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Level {currentUser?.level || 1}</span>
                        <span className="text-xs font-medium text-primary">{currentUser?.xp || 0} / {(currentUser?.level || 1) * 500} XP</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(((currentUser?.xp || 0) / ((currentUser?.level || 1) * 500)) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <StatCard
                            title="Consistency"
                            value={`${stats.consistencyScore}%`}
                            icon={Flame}
                            trend={stats.consistencyTrend === 'up' ? "↑ improving" : "↓ declining"}
                            color="text-orange-500"
                        />
                        <StatCard
                            title="Deep Focus"
                            value={`${stats.focusScore}/100`}
                            icon={Clock}
                            trend="Deep Flow"
                            color="text-blue-500"
                        />
                        <StatCard
                            title="Daily Streak"
                            value={`${stats.streak} Days`}
                            icon={TrendingUp}
                            trend="Streak"
                            color="text-green-500"
                        />
                        <StatCard
                            title="Badges"
                            value={stats.achievements || 0}
                            icon={Award}
                            trend="Collection"
                            color="text-purple-500"
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

            <Heatmap data={stats.heatmapData} />

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
                                <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded">Productivity: {hasData ? insight?.productivity_score : 0}%</span>
                                <span className="text-xs text-indigo-200">System Ready</span>
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
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, trend, color }) => (
    <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
            <div className={`p - 2 rounded - lg bg - opacity - 10 ${color.replace('text-', 'bg-')} `}>
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
