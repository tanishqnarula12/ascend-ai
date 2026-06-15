import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FileText, Download, Calendar, Target, AlertTriangle, Lightbulb, CheckCircle, AlertCircle, Square, TrendingUp, TrendingDown, Flame, Sparkles, Award } from 'lucide-react';
import { motion } from 'framer-motion';

// Map graded burnout levels to colour classes for the report card.
const burnoutStyle = (risk) => {
    switch ((risk || '').toUpperCase()) {
        case 'SEVERE': return { box: 'bg-red-600/10 border-red-600/20', text: 'text-red-600', dot: 'bg-red-600' };
        case 'HIGH': return { box: 'bg-orange-500/10 border-orange-500/20', text: 'text-orange-500', dot: 'bg-orange-500' };
        case 'MODERATE': return { box: 'bg-yellow-500/10 border-yellow-500/20', text: 'text-yellow-500', dot: 'bg-yellow-500' };
        case 'LOW': return { box: 'bg-green-500/10 border-green-500/20', text: 'text-green-500', dot: 'bg-green-500' };
        default: return { box: 'bg-secondary/50 border-border', text: 'text-muted-foreground', dot: 'bg-muted-foreground' };
    }
};

// Turn a completion rate into a letter grade so the week feels like a scorecard.
const gradeFor = (rate) => {
    if (rate >= 90) return { letter: 'A+', label: 'Elite week', color: 'text-green-500', ring: '#22c55e' };
    if (rate >= 80) return { letter: 'A', label: 'Outstanding', color: 'text-green-500', ring: '#22c55e' };
    if (rate >= 70) return { letter: 'B', label: 'Strong', color: 'text-emerald-500', ring: '#10b981' };
    if (rate >= 55) return { letter: 'C', label: 'Solid effort', color: 'text-yellow-500', ring: '#eab308' };
    if (rate >= 40) return { letter: 'D', label: 'Inconsistent', color: 'text-orange-500', ring: '#f97316' };
    return { letter: 'E', label: 'Needs a reset', color: 'text-red-500', ring: '#ef4444' };
};

// Big circular completion gauge — the hero stat of each report.
const CompletionRing = ({ rate, ringColor }) => {
    const r = 52;
    const circ = 2 * Math.PI * r;
    return (
        <div className="relative w-36 h-36 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-secondary" />
                <circle
                    cx="60" cy="60" r={r} fill="none"
                    stroke={ringColor} strokeWidth="10" strokeLinecap="round"
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

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const res = await api.get('/goals/reports');
                setReports(res.data);
            } catch (error) {
                console.error("Failed to fetch reports");
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    const handleDownload = () => window.print();

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <FileText size={18} className="text-primary" />
                </div>
            </div>
            <p className="text-sm text-muted-foreground">Generating your performance analysis…</p>
        </div>
    );

    const latest = reports[0];

    return (
        <div className="space-y-8 pb-12">
            {/* Print-only letterhead — gives the exported PDF a professional document feel */}
            <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                            <Sparkles size={22} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-extrabold tracking-tight text-slate-900">AscendAI</p>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Performance Intelligence Report</p>
                        </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                        <p className="font-semibold text-slate-700">Generated {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p>Confidential · For the account holder</p>
                    </div>
                </div>
            </div>

            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
                <div>
                    <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
                        <Sparkles size={13} /> AI Performance Reports
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Your Productivity Story</h1>
                    <p className="text-muted-foreground mt-1">Weekly deep dives into how you're evolving — and where to push next.</p>
                </div>
                {latest && (
                    <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                        <Award size={22} className={gradeFor(latest.completion_rate).color} />
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Latest grade</p>
                            <p className={`text-lg font-extrabold leading-none ${gradeFor(latest.completion_rate).color}`}>
                                {gradeFor(latest.completion_rate).letter}
                                <span className="text-xs font-medium text-muted-foreground ml-2">{gradeFor(latest.completion_rate).label}</span>
                            </p>
                        </div>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 gap-6">
                {reports.length === 0 ? (
                    <div className="bg-card p-12 rounded-2xl border border-dashed border-border text-center">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <FileText size={28} className="text-primary" />
                        </div>
                        <h3 className="font-bold text-lg">No reports yet</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Complete a few tasks and your first AI weekly report will appear here automatically — with a grade, insights, and trends.</p>
                    </div>
                ) : (
                    reports.map((report, i) => {
                        const grade = gradeFor(report.completion_rate);
                        const bStyle = burnoutStyle(report.burnout_risk);
                        const consistency = report.focus_hours > 10 ? Math.round(report.focus_hours / 10) : report.focus_hours;
                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={i}
                                className="relative bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden break-inside-avoid print:shadow-none print:border-slate-300"
                            >
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-indigo-500 to-purple-500" />

                                <div className="p-6 md:p-8">
                                    {/* Top row: date + actions */}
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="inline-flex items-center gap-2 text-sm font-semibold bg-secondary/60 px-3 py-1.5 rounded-full">
                                            <Calendar size={14} className="text-primary" />
                                            <span>{new Date(report.start_date).toLocaleDateString()} – {new Date(report.end_date).toLocaleDateString()}</span>
                                            {i === 0 && <span className="ml-1 text-[10px] font-bold uppercase bg-primary text-primary-foreground px-1.5 py-0.5 rounded">Latest</span>}
                                        </div>
                                        <button
                                            onClick={handleDownload}
                                            title="Download / print report"
                                            className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors text-primary text-sm font-semibold print:hidden"
                                        >
                                            <Download size={16} /> Export PDF
                                        </button>
                                    </div>

                                    {/* Hero: ring + grade + summary */}
                                    <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
                                        <div className="flex flex-col items-center gap-3">
                                            <CompletionRing rate={report.completion_rate} ringColor={grade.ring} />
                                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/60 ${grade.color}`}>
                                                <span className="text-lg font-extrabold leading-none">{grade.letter}</span>
                                                <span className="text-xs font-medium text-muted-foreground">{grade.label}</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-bold mb-2 flex items-center gap-2">
                                                <Lightbulb className="text-yellow-500" size={18} /> AI Summary
                                            </h3>
                                            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">{report.ai_summary}</p>

                                            {/* Stat tiles */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
                                                <div className="p-3 bg-secondary/50 rounded-xl">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <TrendingUp size={13} className="text-primary" />
                                                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Completion</p>
                                                    </div>
                                                    <p className="text-xl font-bold text-foreground">{report.completion_rate}%</p>
                                                </div>
                                                <div className="p-3 bg-secondary/50 rounded-xl">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <Flame size={13} className="text-orange-500" />
                                                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Consistency</p>
                                                    </div>
                                                    <p className="text-xl font-bold text-foreground">{consistency}/10</p>
                                                </div>
                                                <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl col-span-2 sm:col-span-1">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <CheckCircle size={13} className="text-primary" />
                                                        <p className="text-[10px] font-bold uppercase text-primary">Lifetime</p>
                                                    </div>
                                                    <p className="text-xl font-bold text-primary">{report.total_tasks_completed || 0} <span className="text-xs font-medium">tasks</span></p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Goal insights + burnout */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                        <div className="p-5 border border-border rounded-xl">
                                            <h4 className="font-bold flex items-center gap-2 mb-3 text-sm">
                                                <Target className="text-indigo-500" size={16} /> Goal Insights
                                            </h4>
                                            <div className="space-y-2.5">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-muted-foreground flex items-center gap-1.5"><TrendingUp size={13} className="text-green-500" /> Strongest</span>
                                                    <span className="font-semibold text-green-500 truncate max-w-[55%]">{report.strongest_goal || 'None yet'}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-muted-foreground flex items-center gap-1.5"><TrendingDown size={13} className="text-red-500" /> Needs work</span>
                                                    <span className="font-semibold text-red-500 truncate max-w-[55%]">{report.weakest_goal || 'None yet'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`p-5 rounded-xl border ${bStyle.box}`}>
                                            <h4 className={`font-bold flex items-center gap-2 mb-3 text-sm ${bStyle.text}`}>
                                                <AlertTriangle size={16} /> Burnout Risk
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2.5 h-2.5 rounded-full ${bStyle.dot}`} />
                                                <p className={`text-sm font-bold uppercase tracking-wider ${bStyle.text}`}>{report.burnout_risk || 'N/A'}</p>
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
                                            <h4 className="font-bold flex items-center gap-2 mb-4 text-sm text-primary">
                                                <CheckCircle size={16} /> Permanent Task Snapshot
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
