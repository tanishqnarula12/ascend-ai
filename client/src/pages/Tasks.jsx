import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Calendar, CheckSquare, Square, Trash2, ArrowRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Tasks = () => {
    const { refreshUser } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [goals, setGoals] = useState([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [selectedGoal, setSelectedGoal] = useState('');
    const [difficulty, setDifficulty] = useState('medium');
    const [celebrate, setCelebrate] = useState(null);

    const fetchTasks = async () => {
        try {
            const res = await api.get('/tasks?today=true');
            setTasks(res.data);
        } catch (error) {
            console.error("Failed to fetch tasks");
        }
    };

    const fetchGoals = async () => {
        try {
            const res = await api.get('/goals');
            setGoals(res.data);
        } catch (error) {
            console.error("Failed to fetch goals");
        }
    };

    useEffect(() => {
        fetchTasks();
        fetchGoals();
    }, []);

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            await api.post('/tasks', {
                title: newTaskTitle,
                goal_id: selectedGoal || null,
                difficulty,
                due_date: new Date().toISOString().split('T')[0] // Today
            });
            setNewTaskTitle('');
            fetchTasks();
        } catch (error) {
            console.error("Failed to add task");
        }
    };

    const toggleTask = async (task) => {
        try {
            // Optimistic update
            const updatedTasks = tasks.map(t =>
                t.id === task.id ? { ...t, is_completed: !t.is_completed } : t
            );
            setTasks(updatedTasks);

            if (!task.is_completed) {
                setCelebrate(task.id);
                setTimeout(() => setCelebrate(null), 1000);
            }

            await api.put(`/tasks/${task.id}`, {
                is_completed: !task.is_completed
            });

            // Refresh user XP/Level data
            if (!task.is_completed) {
                refreshUser();
            }
        } catch (error) {
            console.error("Failed to update task");
            fetchTasks(); // Revert on error
        }
    };

    const deleteTask = async (id) => {
        try {
            await api.delete(`/tasks/${id}`);
            setTasks(tasks.filter(t => t.id !== id));
        } catch (error) {
            console.error("Failed to delete task");
        }
    };

    const completedCount = tasks.filter(t => t.is_completed).length;
    const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Daily Tasks</h1>
                    <p className="text-muted-foreground mt-1">Focus on what matters today.</p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{progress}%</div>
                    <div className="text-xs text-muted-foreground">Daily Progress</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            {/* Add Task Form */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                <form onSubmit={handleAddTask} className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full">
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="What needs to be done?"
                            className="w-full bg-transparent border-none focus:ring-0 text-lg placeholder:text-muted-foreground"
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <select
                            value={selectedGoal}
                            onChange={(e) => setSelectedGoal(e.target.value)}
                            className="bg-secondary text-sm rounded-lg px-3 py-2 border-none focus:ring-2 focus:ring-primary w-full md:w-40"
                        >
                            <option value="">No Goal</option>
                            {goals.map(g => (
                                <option key={g.id} value={g.id}>{g.title}</option>
                            ))}
                        </select>
                        <select
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                            className="bg-secondary text-sm rounded-lg px-3 py-2 border-none focus:ring-2 focus:ring-primary w-full md:w-28"
                        >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                        <button type="submit" className="bg-primary text-primary-foreground p-2 rounded-lg hover:bg-primary/90 transition-colors">
                            <Plus size={20} />
                        </button>
                    </div>
                </form>
            </div>

            {/* Task List */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {tasks.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-12 text-muted-foreground"
                        >
                            <CheckSquare size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No tasks for today. Add one to get started!</p>
                        </motion.div>
                    )}

                    {tasks.map((task) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            key={task.id}
                            className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 relative overflow-hidden ${task.is_completed
                                ? 'bg-secondary/30 border-transparent opacity-60'
                                : 'bg-card border-border hover:border-primary/50 hover:shadow-sm'
                                }`}
                        >
                            {celebrate === task.id && (
                                <motion.div
                                    initial={{ y: 0, opacity: 1 }}
                                    animate={{ y: -50, opacity: 0 }}
                                    className="absolute left-4 top-4 text-primary font-bold flex items-center gap-1 z-20 pointer-events-none"
                                >
                                    <Zap size={14} fill="currentColor" /> +{task.difficulty === 'hard' ? 60 : task.difficulty === 'medium' ? 25 : 10} XP
                                </motion.div>
                            )}
                            <div className="flex items-center gap-4 flex-1">
                                <button
                                    onClick={() => toggleTask(task)}
                                    className={`flex-shrink-0 transition-colors ${task.is_completed ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                                        }`}
                                >
                                    {task.is_completed ? <CheckSquare size={24} /> : <Square size={24} />}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <p className={`font-medium truncate ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                        {task.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${task.difficulty === 'hard' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                            task.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            }`}>
                                            {task.difficulty}
                                        </span>
                                        {task.goal_id && (
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <ArrowRight size={10} />
                                                {goals.find(g => g.id === task.goal_id)?.title || 'Linked Goal'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => deleteTask(task.id)}
                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-2"
                            >
                                <Trash2 size={18} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Tasks;
