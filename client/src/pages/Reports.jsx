import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FileText, Download, Calendar, Target, AlertTriangle, Lightbulb, CheckCircle, AlertCircle, Square, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { computeRank } from '../lib/rank';
import logo from '../assets/logo.png';

// Burnout keeps a semantic accent (it conveys real risk) but sits in a neutral box.
const burnoutAccent = (risk) => {
    switch ((risk || '').toUpperCase()) {
        case 'SEVERE': return 'text-red-600';
        case 'HIGH': return 'text-orange-500';
        case 'MODERATE': return 'text-yellow-500';
        case 'LOW': return 'text-green-500';
        default: return 'text-muted-foreground';
    }
};

const ACCENT = '#6366f1'; // single indigo accent used across reports

// Big circular completion gauge — the hero stat of each report.
const CompletionRing = ({ rate }) => {
    const r = 52;
    const circ = 2 * Math.PI * r;
    return (
        <div className="relative w-36 h-36 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-secondary" />
                <circle
                    cx="60" cy="60" r={r} fill="none"
                    stroke={ACCENT} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={circ * (1 - rate / 100)}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-foreground">{rate}%</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">completed</span>
            </div>
        </div>
    );
};

const Tile = ({ label, value, unit }) => (
    <div className="p-3 bg-secondary/50 rounded-xl border border-border/50">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}{unit && <span className="text-xs font-medium text-muted-foreground ml-1">{unit}</span>}</p>
    </div>
);

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [printId, setPrintId] = useState(null);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [reportsRes, anaRes, advRes, focusRes] = await Promise.all([
                    api.get('/goals/reports'),
                    api.get('/goals/analytics').catch(() => ({ data: {} })),
                    api.get('/ai/advanced-analytics').catch(() => ({ data: {} })),
                    api.get('/ai/focus/stats').catch(() => ({ data: {} })),
                ]);
                setReports(reportsRes.data);
                setStats({
                    totalTasks: anaRes.data?.totalTasks || 0,
                    streak: anaRes.data?.streak || 0,
                    consistencyScore: advRes.data?.consistency?.score || 0,
                    focusScore: focusRes.data?.focus_score || 0,
                });
            } catch (error) {
                console.error("Failed to fetch reports");
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    // Export only the clicked report: mark it, let the print: classes apply, then print.
    useEffect(() => {
        if (printId === null) return;
        const after = () => setPrintId(null);
        window.addEventListener('afterprint', after);
        const t = setTimeout(() => window.print(), 80);
        return () => { clearTimeout(t); window.removeEventListener('afterprint', after); };
    }, [printId]);

    const handleExport = (i) => setPrintId(i);

    const rank = computeRank(stats);
    const RankIcon = rank.tier.icon;

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-secondary" />
                <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <FileText size={18} className="text-muted-foreground" />
                </div>
            </div>
            <p className="text-sm text-muted-foreground">Generating your performance analysis…</p>
        </div>
    );

    return (
        <div className="space-y-8 pb-12">
            {/* Print-only letterhead — gives the exported PDF a clean, professional document feel */}
            <div className="hidden print:block mb-8 border-b border-slate-300 pb-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={logo} alt="AscendAI" className="h-10 w-10 object-contain" />
                        <div>
                            <p className="text-xl font-extrabold tracking-tight text-slate-900">AscendAI</p>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Performance Intelligence Report</p>
                        </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                        <p className="font-semibold text-slate-700">Generated {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p className="italic">Engineered to empower productivity</p>
                    </div>
                </div>
            </div>

            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
                <div className="flex items-center gap-3">
                    <img src={logo} alt="AscendAI" className="h-10 w-10 object-contain" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Your Productivity Story</h1>
                        <p className="text-muted-foreground mt-1">Weekly deep dives into how you're evolving — and where to push next.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                    <div className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center">
                        <RankIcon size={18} className="text-indigo-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Current League</p>
                        <p className="text-base font-bold leading-none mt-0.5">
                            {rank.tier.name} {rank.division}
                            <span className="text-xs font-medium text-muted-foreground ml-2">{rank.score.toLocaleString()} pts</span>
                        </p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6">
                {reports.length === 0 ? (
                    <div className="bg-card p-12 rounded-2xl border border-dashed border-border text-center">
                        <div className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center mx-auto mb-4">
                            <FileText size={28} className="text-muted-foreground" />
                        </div>
                        <h3 className="font-bold text-lg">No reports yet</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Complete a few tasks and your first AI weekly report will appear here automatically — with insights, trends and your league standing.</p>
                    </div>
                ) : (
                    reports.map((report, i) => {
                        const consistency = report.focus_hours > 10 ? Math.round(report.focus_hours / 10) : report.focus_hours;
                        const hidden = printId !== null && printId !== i;
                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={i}
                                className={`bg-card rounded-2xl border border-border transition-colors hover:border-foreground/20 break-inside-avoid print:shadow-none print:border-slate-300 ${hidden ? 'print:hidden' : ''}`}
                            >
                                <div className="p-6 md:p-8">
                                    {/* Top row: date + actions */}
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="inline-flex items-center gap-2 text-sm font-semibold bg-secondary/60 px-3 py-1.5 rounded-full">
                                            <Calendar size={14} className="text-muted-foreground" />
                                            <span>{new Date(report.start_date).toLocaleDateString()} – {new Date(report.end_date).toLocaleDateString()}</span>
                                            {i === 0 && <span className="ml-1 text-[10px] font-bold uppercase bg-foreground text-background px-1.5 py-0.5 rounded">Latest</span>}
                                        </div>
                                        <button
                                            onClick={() => handleExport(i)}
                                            title="Export this report as PDF"
                                            className="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/70 rounded-lg transition-colors text-foreground text-sm font-semibold print:hidden"
                                        >
                                            <Download size={16} /> Export PDF
                                        </button>
                                    </div>

                                    {/* Hero: ring + league + summary */}
                                    <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
                                        <div className="flex flex-col items-center gap-3">
                                            <CompletionRing rate={report.completion_rate} />
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/60 border border-border/50">
                                                <RankIcon size={15} className="text-indigo-500" />
                                                <span className="text-sm font-bold">{rank.tier.name} {rank.division}</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-bold mb-2 flex items-center gap-2">
                                                <Lightbulb className="text-indigo-500" size={18} /> AI Summary
                                            </h3>
                                            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">{report.ai_summary}</p>

                                            {/* Stat tiles */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
                                                <Tile label="Completion" value={`${report.completion_rate}%`} />
                                                <Tile label="Consistency" value={`${consistency}/10`} />
                                                <Tile label="Lifetime" value={report.total_tasks_completed || 0} unit="tasks" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Goal insights + burnout */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                        <div className="p-5 border border-border rounded-xl">
                                            <h4 className="font-bold flex items-center gap-2 mb-3 text-sm">
                                                <Target className="text-muted-foreground" size={16} /> Goal Insights
                                            </h4>
                                            <div className="space-y-2.5">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-muted-foreground flex items-center gap-1.5"><TrendingUp size={13} /> Strongest</span>
                                                    <span className="font-semibold text-foreground truncate max-w-[55%]">{report.strongest_goal || 'None yet'}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-muted-foreground flex items-center gap-1.5"><TrendingDown size={13} /> Needs work</span>
                                                    <span className="font-semibold text-muted-foreground truncate max-w-[55%]">{report.weakest_goal || 'None yet'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-5 rounded-xl border border-border">
                                            <h4 className="font-bold flex items-center gap-2 mb-3 text-sm">
                                                <AlertTriangle size={16} className="text-muted-foreground" /> Burnout Risk
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2.5 h-2.5 rounded-full ${burnoutAccent(report.burnout_risk).replace('text-', 'bg-')}`} />
                                                <p className={`text-sm font-bold uppercase tracking-wider ${burnoutAccent(report.burnout_risk)}`}>{report.burnout_risk || 'N/A'}</p>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {(report.burnout_risk || '').toUpperCase() === 'LOW'
                                                    ? 'Sustainable pace — keep your rhythm.'
                                                    : (report.burnout_risk || '').toUpperCase() === 'N/A'
                                                        ? 'Not enough activity to assess.'
                                                        : 'Consider lighter days to recover and protect momentum.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Embedded Habit Matrix */}
                                    {report.habit_matrix && report.habit_matrix.length > 0 && (
                                        <div className="mt-6 border-t border-border pt-6">
                                            <h4 className="font-bold flex items-center gap-2 mb-4 text-sm">
                                                <CheckCircle size={16} className="text-muted-foreground" /> Permanent Task Snapshot
                                            </h4>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead>
                                                        <tr>
                                                            <th className="p-2 font-medium text-muted-foreground border-b border-border">Task ↴</th>
                                                            {[6, 5, 4, 3, 2, 1, 0].map(daysAgo => {
                                                                const d = new Date(report.end_date);
                                                                d.setDate(d.getDate() - daysAgo);
                                                                const dateStr = d.toISOString().split('T')[0];
                                                                return <th key={daysAgo} className="p-2 font-medium text-center text-muted-foreground border-b border-border" title={dateStr}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</th>
                                                            })}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {report.habit_matrix.map(habit => (
                                                            <tr key={habit.id} className="hover:bg-secondary/10">
                                                                <td className="p-2 border-b border-border text-muted-foreground max-w-[150px] truncate">{habit.title}</td>
                                                                {[6, 5, 4, 3, 2, 1, 0].map(daysAgo => {
                                                                    const d = new Date(report.end_date);
                                                                    d.setDate(d.getDate() - daysAgo);
                                                                    const dateStr = d.toISOString().split('T')[0];
                                                                    const taskForDay = habit.tasks.find(t => t.due_date.startsWith(dateStr));

                                                                    return (
                                                                        <td key={daysAgo} className="p-2 border-b border-border text-center">
                                                                            {taskForDay ? (
                                                                                taskForDay.is_completed ? (
                                                                                    <CheckCircle size={16} className="text-green-500 mx-auto" />
                                                                                ) : (
                                                                                    <AlertCircle size={16} className="text-red-500 mx-auto" />
                                                                                )
                                                                            ) : dateStr < new Date().toISOString().split('T')[0] ? (
                                                                                <AlertCircle size={16} className="text-red-500 mx-auto" />
                                                                            ) : (
                                                                                <Square size={16} className="text-muted-foreground/30 mx-auto" />
                                                                            )}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Reports;
