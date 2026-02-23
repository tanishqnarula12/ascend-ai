import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { Target, Zap, Clock, Calendar, ChevronRight } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const Analytics = () => {
    const [analytics, setAnalytics] = useState(null);
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [analyticsRes, goalsRes] = await Promise.all([
                    api.get('/goals/analytics'),
                    api.get('/goals')
                ]);
                setAnalytics(analyticsRes.data);
                setGoals(goalsRes.data);
            } catch (error) {
                console.error("Failed to fetch analytics");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );

    const goalStatusData = [
        { name: 'Completed', value: goals.filter(g => g.status === 'completed').length },
        { name: 'In Progress', value: goals.filter(g => g.status === 'in-progress').length },
        { name: 'Abandoned', value: goals.filter(g => g.status === 'abandoned').length },
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-8 pb-12">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
                <p className="text-muted-foreground mt-1">Deep dive into your progress and patterns.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Weekly Volume */}
                <div className="lg:col-span-2 bg-card p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-semibold">Activity Volume</h3>
                            <p className="text-xs text-muted-foreground">Tasks completed over the last 7 days</p>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                                Consistency: {analytics?.streak} days
                            </span>
                        </div>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics?.graphData}>
                                <defs>
                                    <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'gray', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'gray', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="completion"
                                    stroke="#3b82f6"
                                    fillOpacity={1}
                                    fill="url(#colorCompletion)"
                                    strokeWidth={3}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Goal Distribution */}
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                    <h3 className="text-lg font-semibold mb-6">Goal Distribution</h3>
                    <div className="h-[250px]">
                        {goalStatusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={goalStatusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {goalStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                                <Target size={40} className="mb-2" />
                                <p className="text-sm italic">No goal data available</p>
                            </div>
                        )}
                    </div>
                    <div className="mt-4 space-y-2">
                        {goalStatusData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span>{entry.name}</span>
                                </div>
                                <span className="font-semibold">{entry.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Goal Progress Detailed */}
            <div className="bg-card p-6 rounded-xl border border-border">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <Target className="text-primary" size={20} /> Goal Success Metrics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {goals.length === 0 ? (
                        <p className="col-span-full text-center py-8 text-muted-foreground italic">
                            Create goals to track long-term progress.
                        </p>
                    ) : (
                        goals.map(goal => (
                            <div key={goal.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-medium truncate pr-4">{goal.title}</h4>
                                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                        {goal.goal_type}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary"
                                            style={{ width: `${goal.progress}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs font-bold">{goal.progress}%</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                    <span>Added: {new Date(goal.created_at).toLocaleDateString()}</span>
                                    <span className={`capitalize ${goal.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`}>
                                        {goal.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )
                    }
                </div>
            </div>
        </div>
    );
};

export default Analytics;
