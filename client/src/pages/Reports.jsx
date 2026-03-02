import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FileText, Download, Calendar, Target, AlertTriangle, Lightbulb, CheckCircle, AlertCircle, Square } from 'lucide-react';
import { motion } from 'framer-motion';

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                // For demo, we trigger a report generation if none exist
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

    const handleDownload = (report) => {
        // Simple print-based PDF download
        window.print();
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Generating your performance analysis...</div>;

    return (
        <div className="space-y-8 pb-12">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">AI performance Reports</h1>
                <p className="text-muted-foreground mt-1">Weekly deep dives into your productivity evolution.</p>
            </header>

            <div className="grid grid-cols-1 gap-6">
                {reports.length === 0 ? (
                    <div className="bg-card p-12 rounded-2xl border border-dashed border-border text-center">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <h3 className="font-bold">No reports yet</h3>
                        <p className="text-sm text-muted-foreground">Keep using AscendAI. Your first weekly report will appear here automatically.</p>
                    </div>
                ) : (
                    reports.map((report, i) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={i}
                            className="bg-card p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-8">
                                <button
                                    onClick={() => handleDownload(report)}
                                    className="p-2 hover:bg-secondary rounded-full transition-colors"
                                >
                                    <Download size={20} className="text-muted-foreground" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 text-primary font-bold text-sm mb-4">
                                <Calendar size={16} />
                                <span>{new Date(report.start_date).toLocaleDateString()} - {new Date(report.end_date).toLocaleDateString()}</span>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <div>
                                        <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                                            <Lightbulb className="text-yellow-500" size={20} /> AI Summary
                                        </h3>
                                        <p className="text-muted-foreground leading-relaxed">{report.ai_summary}</p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 bg-secondary/50 rounded-xl">
                                            <p className="text-[10px] md:text-xs font-bold uppercase text-muted-foreground mb-1">Completion Rate</p>
                                            <p className="text-xl md:text-2xl font-bold text-primary">{report.completion_rate}%</p>
                                        </div>
                                        <div className="p-4 bg-secondary/50 rounded-xl">
                                            <p className="text-[10px] md:text-xs font-bold uppercase text-muted-foreground mb-1">Focus Time</p>
                                            <p className="text-xl md:text-2xl font-bold text-primary">{report.focus_hours} hrs</p>
                                        </div>
                                        <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                                            <p className="text-[10px] md:text-xs font-bold uppercase text-primary mb-1">Total Progress</p>
                                            <p className="text-xl md:text-2xl font-bold text-primary">{report.total_tasks_completed || 0} tasks</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-6 border border-border rounded-xl">
                                        <h4 className="font-bold flex items-center gap-2 mb-3">
                                            <Target className="text-indigo-500" size={18} /> Goal Insights
                                        </h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Strongest:</span>
                                                <span className="font-medium text-green-500">{report.strongest_goal || 'None'}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Improvement:</span>
                                                <span className="font-medium text-red-500">{report.weakest_goal || 'None'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`p-6 rounded-xl border ${report.burnout_risk === 'HIGH' ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                                        <h4 className={`font-bold flex items-center gap-2 mb-2 ${report.burnout_risk === 'HIGH' ? 'text-red-500' : 'text-green-500'}`}>
                                            <AlertTriangle size={18} /> Burnout Risk
                                        </h4>
                                        <p className="text-xs font-medium uppercase tracking-widest">{report.burnout_risk}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Embedded Habit Matrix */}
                            {report.habit_matrix && report.habit_matrix.length > 0 && (
                                <div className="mt-8 border-t border-border pt-6">
                                    <h4 className="font-bold flex items-center gap-2 mb-4 text-primary">
                                        <CheckCircle size={18} /> Permanent Task Snapshot
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
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Reports;
