// AscendAI Rank / League engine.
// Converts a user's real activity into a single "Ascend Score", then maps it to a
// league tier + division (III → I). The streak is weighted heavily so showing up
// every day is the fastest way to climb — that's the daily-game retention loop.
import { Shield, Award, Trophy, Gem, Sparkles, Crown, Flame } from 'lucide-react';

export const TIERS = [
    { name: 'Bronze', min: 0, icon: Shield, text: 'text-amber-600', from: 'from-amber-700', to: 'to-amber-500', ring: '#d97706', glow: 'bg-amber-500/10' },
    { name: 'Silver', min: 300, icon: Award, text: 'text-slate-400', from: 'from-slate-400', to: 'to-slate-200', ring: '#94a3b8', glow: 'bg-slate-400/10' },
    { name: 'Gold', min: 900, icon: Trophy, text: 'text-yellow-500', from: 'from-yellow-500', to: 'to-amber-300', ring: '#eab308', glow: 'bg-yellow-500/10' },
    { name: 'Platinum', min: 2000, icon: Gem, text: 'text-cyan-400', from: 'from-cyan-400', to: 'to-teal-300', ring: '#22d3ee', glow: 'bg-cyan-500/10' },
    { name: 'Diamond', min: 4000, icon: Gem, text: 'text-sky-400', from: 'from-sky-400', to: 'to-indigo-400', ring: '#38bdf8', glow: 'bg-sky-500/10' },
    { name: 'Master', min: 7000, icon: Crown, text: 'text-purple-500', from: 'from-purple-500', to: 'to-fuchsia-400', ring: '#a855f7', glow: 'bg-purple-500/10' },
    { name: 'Ascendant', min: 11000, icon: Flame, text: 'text-rose-500', from: 'from-rose-500', to: 'to-orange-400', ring: '#f43f5e', glow: 'bg-rose-500/10' },
];

// How each input contributes to the score — exposed so the UI can teach the game.
export const SCORE_WEIGHTS = [
    { key: 'totalTasks', label: 'Tasks completed', per: 12, icon: Sparkles, desc: 'Every task you finish, forever.' },
    { key: 'streak', label: 'Day streak', per: 50, icon: Flame, desc: 'Highest payout — keep showing up daily.' },
    { key: 'consistencyScore', label: 'Consistency', per: 4, icon: Trophy, desc: 'Your 30-day rhythm score.' },
    { key: 'focusScore', label: 'Focus', per: 2, icon: Gem, desc: 'Deep-work sessions logged.' },
];

export function computeScore(stats = {}) {
    const totalTasks = stats.totalTasks || 0;
    const streak = stats.streak || 0;
    const consistency = stats.consistencyScore || 0;
    const focus = stats.focusScore || 0;
    return Math.round(totalTasks * 12 + streak * 50 + consistency * 4 + focus * 2);
}

// Per-input point contribution, for the "how you earn points" breakdown.
export function scoreBreakdown(stats = {}) {
    return SCORE_WEIGHTS.map(w => ({
        ...w,
        value: stats[w.key] || 0,
        points: Math.round((stats[w.key] || 0) * w.per),
    }));
}

export function computeRank(stats = {}) {
    const score = computeScore(stats);

    let idx = 0;
    for (let i = 0; i < TIERS.length; i++) if (score >= TIERS[i].min) idx = i;

    const tier = TIERS[idx];
    const next = TIERS[idx + 1] || null;
    const floor = tier.min;
    const ceil = next ? next.min : tier.min;
    const span = ceil - floor || 1;
    const intoTier = score - floor;

    const progress = next ? Math.min(100, Math.round((intoTier / span) * 100)) : 100;
    const pointsToNext = next ? Math.max(0, ceil - score) : 0;
    // Division within a tier: III (just promoted) → I (about to ascend)
    const division = next ? ['III', 'II', 'I'][Math.min(2, Math.floor((intoTier / span) * 3))] : 'I';

    return { score, tier, tierIndex: idx, next, progress, pointsToNext, division };
}

// A motivating estimate of what today's effort added — keeps the game feeling live.
export function pointsEarnedToday(stats = {}) {
    const todayDone = stats.completedTasks || 0;
    return todayDone * 12 + (stats.streak > 0 ? 50 : 0);
}
