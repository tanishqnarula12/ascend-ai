import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Target, Trash2, Edit2, CheckCircle2, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';

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

    return (
        <div className="space-y-6">
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} onEdit={() => openModal(goal)} onDelete={() => handleDelete(goal.id)} />
                ))}
            </div>

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
    const progressColor = goal.progress >= 100 ? 'bg-green-500' : goal.progress >= 50 ? 'bg-blue-500' : 'bg-orange-500';

    return (
        <div className="bg-card w-full rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${progressColor}`}></div>

            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-secondary text-secondary-foreground uppercase tracking-wider">{goal.category}</span>
                    <span className="text-xs text-muted-foreground border border-border px-2 py-1 rounded uppercase tracking-wider">{goal.goal_type}</span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onEdit} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"><Edit2 size={16} /></button>
                    <button onClick={onDelete} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
                </div>
            </div>

            <h3 className="text-xl font-bold mb-2 line-clamp-1" title={goal.title}>{goal.title}</h3>
            <p className="text-muted-foreground text-sm mb-6 line-clamp-2 h-10">{goal.description}</p>

            <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                    <span>Progress</span>
                    <span>{goal.progress}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${progressColor} transition-all duration-500`} style={{ width: `${goal.progress}%` }}></div>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex justify-between items-center text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>{goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'No deadline'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Target size={16} />
                    <span>{goal.status}</span>
                </div>
            </div>
        </div>
    );
};

export default Goals;
