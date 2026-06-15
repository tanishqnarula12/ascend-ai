import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Target, Trash2, Edit2, Clock, CheckCircle, TrendingUp, Loader, Flag } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';

// One precise accent per category — used only for the chip + progress bar, not the whole card.
const CAT = {
    Personal: { chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', bar: 'bg-blue-500' },
    Career: { chip: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', bar: 'bg-violet-500' },
    Health: { chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
    Finance: { chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' },
};
const cat = (c) => CAT[c] || { chip: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', bar: 'bg-indigo-500' };

const Goals = () => {
    const [goals, setGoals] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { register, handleSubmit, reset } = useForm();
    const [editingGoal, setEditingGoal] = useState(null);

    const fetchGoals = async () => {
        try {
            const res = await api.get('/goals');
            setGoals(res.data);
        } catch (error) {
            console.error("Failed to fetch goals");
        }
    };

    useEffect(() => {
        fetchGoals();
    }, []);

    const onSubmit = async (data) => {
        try {
            if (editingGoal) {
                await api.put(`/goals/${editingGoal.id}`, data);
            } else {
                await api.post('/goals', data);
            }
            fetchGoals();
            closeModal();
        } catch (error) {
            console.error("Failed to save goal");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this goal?')) {
            try {
                await api.delete(`/goals/${id}`);
                fetchGoals();
            } catch (error) {
                console.error("Failed to delete goal");
            }
        }
    };

    const openModal = (goal = null) => {
        setEditingGoal(goal);
        if (goal) {
            reset(goal); // Populate form
        } else {
            reset({ title: '', description: '', category: 'Personal', goal_type: 'short-term', deadline: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingGoal(null);
    };

    // Summary metrics
    const completed = goals.filter(g => g.status === 'completed').length;
    const inProgress = goals.filter(g => g.status !== 'completed').length;
    const avgProgress = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length) : 0;

    const SUMMARY = [
        { label: 'Total Goals', value: goals.length, icon: Target, chip: 'bg-indigo-500/10', color: 'text-indigo-500' },
        { label: 'Completed', value: completed, icon: CheckCircle, chip: 'bg-emerald-500/10', color: 'text-emerald-500' },
        { label: 'In Progress', value: inProgress, icon: Loader, chip: 'bg-amber-500/10', color: 'text-amber-500' },
        { label: 'Avg Progress', value: `${avgProgress}%`, icon: TrendingUp, chip: 'bg-violet-500/10', color: 'text-violet-500' },
    ];

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Goals</h1>
                    <p className="text-muted-foreground mt-1">Define your north star and break it down.</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus size={20} /> New Goal
                </button>
            </div>

            {/* Summary KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {SUMMARY.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className="bg-card border border-border rounded-2xl p-5 transition-colors hover:border-foreground/20">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{s.label}</p>
                                <div className={`w-8 h-8 rounded-lg ${s.chip} flex items-center justify-center`}>
                                    <Icon size={15} className={s.color} />
                                </div>
                            </div>
                            <p className="text-2xl font-bold leading-none">{s.value}</p>
                        </div>
                    );
                })}
            </div>

            {goals.length === 0 ? (
                <div className="bg-card p-12 rounded-2xl border border-dashed border-border text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Target size={28} className="text-primary" />
                    </div>
                    <h3 className="font-bold text-lg">No goals yet</h3>
                    <p className="text-sm text-muted-foreground mt-1">Create your first goal and break it into daily tasks to start climbing.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {goals.map((goal, i) => (
                        <motion.div key={goal.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                            <GoalCard goal={goal} onEdit={() => openModal(goal)} onDelete={() => handleDelete(goal.id)} />
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-lg p-6 rounded-xl border border-border shadow-xl relative">
                        <button onClick={closeModal} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">X</button>
                        <h2 className="text-xl font-bold mb-4">{editingGoal ? 'Edit Goal' : 'Create New Goal'}</h2>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Goal Title</label>
                                <input {...register('title', { required: true })} className="w-full bg-secondary rounded-lg px-3 py-2 border-none focus:ring-2 focus:ring-primary" placeholder="e.g. Learn Python" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea {...register('description')} className="w-full bg-secondary rounded-lg px-3 py-2 border-none focus:ring-2 focus:ring-primary" rows="3" placeholder="Details..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Category</label>
                                    <select {...register('category')} className="w-full bg-secondary rounded-lg px-3 py-2 border-none focus:ring-2 focus:ring-primary">
                                        <option value="Personal">Personal</option>
                                        <option value="Career">Career</option>
                                        <option value="Health">Health</option>
                                        <option value="Finance">Finance</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Type</label>
                                    <select {...register('goal_type')} className="w-full bg-secondary rounded-lg px-3 py-2 border-none focus:ring-2 focus:ring-primary">
                                        <option value="short-term">Short-term</option>
                                        <option value="long-term">Long-term</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Deadline</label>
                                <input type="date" {...register('deadline')} className="w-full bg-secondary rounded-lg px-3 py-2 border-none focus:ring-2 focus:ring-primary" />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg hover:bg-secondary transition-colors">Cancel</button>
                                <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">Save Goal</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const GoalCard = ({ goal, onEdit, onDelete }) => {
    const done = goal.progress >= 100;
    const c = cat(goal.category);

    return (
        <div className="h-full bg-card rounded-2xl border border-border p-6 transition-colors group hover:border-foreground/20">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${c.chip} uppercase tracking-wider`}>{goal.category}</span>
                    <span className="text-[10px] text-muted-foreground border border-border px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <Flag size={9} /> {goal.goal_type}
                    </span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onEdit} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground"><Edit2 size={15} /></button>
                    <button onClick={onDelete} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive"><Trash2 size={15} /></button>
                </div>
            </div>

            <h3 className="text-lg font-bold mb-1.5 line-clamp-1" title={goal.title}>{goal.title}</h3>
            <p className="text-muted-foreground text-sm mb-5 line-clamp-2 h-10">{goal.description || 'No description added.'}</p>

            <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Progress</span>
                    <span className={done ? 'text-emerald-500 font-bold' : ''}>{goal.progress}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${done ? 'bg-emerald-500' : c.bar}`} style={{ width: `${goal.progress}%` }} />
                </div>
            </div>

            <div className="mt-5 pt-4 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <Clock size={14} />
                    <span>{goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'No deadline'}</span>
                </div>
                <div className={`flex items-center gap-1.5 font-semibold ${done ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {done ? <CheckCircle size={14} /> : <Target size={14} />}
                    <span className="capitalize">{goal.status}</span>
                </div>
            </div>
        </div>
    );
};

export default Goals;
