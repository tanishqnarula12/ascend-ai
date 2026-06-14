import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ListChecks, CheckCircle2, Circle, Eraser } from 'lucide-react';

// A lightweight personal checklist that lives entirely in the browser (localStorage).
// It's intentionally separate from the gamified "Daily Tasks" so users have a
// zero-friction scratchpad for quick to-dos without touching their XP/streak data.
const STORAGE_KEY = 'ascendai_quick_todos';

const loadTodos = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'done', label: 'Done' },
];

const QuickTodo = () => {
    const [todos, setTodos] = useState(loadTodos);
    const [text, setText] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    }, [todos]);

    const addTodo = (e) => {
        e.preventDefault();
        const value = text.trim();
        if (!value) return;
        setTodos(prev => [{ id: Date.now(), text: value, done: false }, ...prev]);
        setText('');
    };

    const toggle = (id) =>
        setTodos(prev => prev.map(t => (t.id === id ? { ...t, done: !t.done } : t)));

    const remove = (id) => setTodos(prev => prev.filter(t => t.id !== id));

    const clearCompleted = () => setTodos(prev => prev.filter(t => !t.done));

    const visible = todos.filter(t =>
        filter === 'active' ? !t.done : filter === 'done' ? t.done : true
    );

    const remaining = todos.filter(t => !t.done).length;
    const completedCount = todos.length - remaining;
    const progress = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0;

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <ListChecks className="text-primary" /> Quick To-Do
                    </h1>
                    <p className="text-muted-foreground mt-1">A simple checklist for everything else on your mind.</p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{remaining}</div>
                    <div className="text-xs text-muted-foreground">{remaining === 1 ? 'item left' : 'items left'}</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            {/* Add Form */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                <form onSubmit={addTodo} className="flex gap-3 items-center">
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Add a quick to-do and press Enter..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-lg placeholder:text-muted-foreground"
                    />
                    <button
                        type="submit"
                        className="bg-primary text-primary-foreground p-2 rounded-lg hover:bg-primary/90 transition-colors"
                        aria-label="Add to-do"
                    >
                        <Plus size={20} />
                    </button>
                </form>
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-2">
                    {FILTERS.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${filter === f.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                {completedCount > 0 && (
                    <button
                        onClick={clearCompleted}
                        className="text-sm text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors"
                    >
                        <Eraser size={15} /> Clear completed
                    </button>
                )}
            </div>

            {/* List */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {visible.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-center py-12 text-muted-foreground"
                        >
                            <ListChecks size={48} className="mx-auto mb-4 opacity-20" />
                            <p>{todos.length === 0 ? 'Your list is empty. Add something above!' : 'Nothing here for this filter.'}</p>
                        </motion.div>
                    )}

                    {visible.map((todo) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            key={todo.id}
                            className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${todo.done
                                ? 'bg-secondary/30 border-transparent opacity-60'
                                : 'bg-card border-border hover:border-primary/50 hover:shadow-sm'
                                }`}
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <button
                                    onClick={() => toggle(todo.id)}
                                    className={`flex-shrink-0 transition-colors ${todo.done ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                                    aria-label={todo.done ? 'Mark as not done' : 'Mark as done'}
                                >
                                    {todo.done ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                </button>
                                <p className={`font-medium truncate ${todo.done ? 'line-through text-muted-foreground' : ''}`}>
                                    {todo.text}
                                </p>
                            </div>
                            <button
                                onClick={() => remove(todo.id)}
                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-2"
                                aria-label="Delete to-do"
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

export default QuickTodo;
