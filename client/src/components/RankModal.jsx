import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Lock } from 'lucide-react';
import { TIERS, computeRank, scoreBreakdown, pointsEarnedToday } from '../lib/rank';

const RankModal = ({ isOpen, onClose, stats = {} }) => {
    if (!isOpen) return null;

    const { score, tier, tierIndex, next, progress, pointsToNext, division } = computeRank(stats);
    const breakdown = scoreBreakdown(stats);
    const today = pointsEarnedToday(stats);
    const TierIcon = tier.icon;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 16 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto"
                >
                    <button onClick={onClose} className="absolute top-5 right-5 p-2 hover:bg-secondary rounded-full transition-colors z-10 text-muted-foreground">
                        <X size={18} />
                    </button>

                    {/* Hero — current rank */}
                    <div className="p-8 pb-6 border-b border-border">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                                <TierIcon size={30} className="text-indigo-500" />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Your League</p>
                                <h2 className="text-2xl font-bold leading-tight">{tier.name} {division}</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">{score.toLocaleString()} Ascend Points</p>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="flex justify-between text-[11px] font-medium text-muted-foreground mb-1.5">
                                <span>{tier.name}</span>
                                <span>{next ? `${pointsToNext.toLocaleString()} pts to ${next.name}` : 'Top league reached'}</span>
                            </div>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Today's gain */}
                    <div className="px-8 py-4 flex items-center justify-between border-b border-border">
                        <p className="text-sm text-muted-foreground">Earned today</p>
                        <p className="text-sm font-bold text-foreground">+{today.toLocaleString()} pts</p>
                    </div>

                    {/* How you earn points */}
                    <div className="px-8 pt-6">
                        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">How you earn points</h3>
                        <div className="grid grid-cols-2 gap-2.5">
                            {breakdown.map((b) => {
                                const Icon = b.icon;
                                return (
                                    <div key={b.key} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/60">
                                        <Icon size={16} className="text-muted-foreground flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold truncate">{b.label}</p>
                                            <p className="text-[11px] text-muted-foreground">{b.value} × {b.per} = <span className="font-semibold text-foreground">{b.points.toLocaleString()}</span></p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* League ladder */}
                    <div className="px-8 py-6">
                        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">League ladder</h3>
                        <div className="space-y-1.5">
                            {TIERS.map((t, i) => {
                                const Icon = t.icon;
                                const isCurrent = i === tierIndex;
                                const isLocked = i > tierIndex;
                                return (
                                    <div
                                        key={t.name}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isCurrent
                                            ? 'border-indigo-500/40 bg-indigo-500/5'
                                            : 'border-transparent'} ${isLocked ? 'opacity-40' : ''}`}
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                                            {isLocked ? <Lock size={15} className="text-muted-foreground" /> : <Icon size={17} className={isCurrent ? 'text-indigo-500' : 'text-muted-foreground'} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold">{t.name}</p>
                                            <p className="text-[11px] text-muted-foreground">{t.min.toLocaleString()}+ points</p>
                                        </div>
                                        {isCurrent && (
                                            <span className="text-[10px] font-semibold uppercase text-indigo-500 flex items-center gap-0.5">
                                                You <ChevronRight size={11} />
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="px-8 py-4 border-t border-border text-center">
                        <p className="text-xs text-muted-foreground">Your streak earns the most — show up daily to keep ascending.</p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default RankModal;
