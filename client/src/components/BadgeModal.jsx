import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Zap, Flame, Target, Shield, Trophy, X } from 'lucide-react';

const BadgeModal = ({ isOpen, onClose, stats }) => {
    const badges = [
        {
            id: 'early_adopter',
            name: 'Pioneer',
            description: 'Joined AscendAI in its initial phase.',
            icon: Trophy,
            color: 'text-yellow-500',
            earned: true
        },
        {
            id: 'streak_3',
            name: 'On Fire',
            description: 'Maintain a 3-day consistency streak.',
            icon: Flame,
            color: 'text-orange-500',
            earned: stats.streak >= 3
        },
        {
            id: 'tasks_10',
            name: 'Decimal Decimation',
            description: 'Complete 10 total tasks.',
            icon: CheckCircle,
            color: 'text-blue-500',
            earned: stats.completedTasks >= 10
        },
        {
            id: 'hard_work',
            name: 'Titan',
            description: 'Complete a "Hard" difficulty task.',
            icon: Shield,
            color: 'text-red-500',
            earned: stats.completedTasks > 0 // Placeholder logic, could be more specific
        },
        {
            id: 'consistency_80',
            name: 'Clockwork',
            description: 'Achieve a Consistency Score over 80%.',
            icon: Target,
            color: 'text-green-500',
            earned: stats.consistencyScore >= 80
        },
        {
            id: 'focus_master',
            name: 'Zen State',
            description: 'Reach a Deep Focus Score of 90+.',
            icon: Zap,
            color: 'text-indigo-500',
            earned: stats.focusScore >= 90
        }
    ];

    const earnedCount = badges.filter(b => b.earned).length;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-card border border-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 hover:bg-secondary rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-8 pb-4">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-primary/10 rounded-2xl">
                                <Award className="text-primary" size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Badge Collection</h2>
                                <p className="text-sm text-muted-foreground">{earnedCount} of {badges.length} Legendary Badges Unlocked</p>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 pb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                            {badges.map((badge) => (
                                <div
                                    key={badge.id}
                                    className={`p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 ${badge.earned
                                            ? 'bg-secondary/50 border-primary/20 shadow-sm'
                                            : 'bg-secondary/10 border-transparent grayscale opacity-40'
                                        }`}
                                >
                                    <div className={`p-3 rounded-xl bg-card border border-border ${badge.earned ? 'shadow-inner' : ''}`}>
                                        <badge.icon className={badge.earned ? badge.color : 'text-muted-foreground'} size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">{badge.name}</h4>
                                        <p className="text-[11px] text-muted-foreground leading-tight">{badge.description}</p>
                                    </div>
                                    {badge.earned && (
                                        <div className="ml-auto">
                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 bg-secondary/30 border-t border-border flex justify-center">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Keep ascending to unlock more</p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

const CheckCircle = ({ className, size }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

export default BadgeModal;
