import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const Heatmap = ({ data }) => {
    // data: array of { date, count, percentage }

    const weeks = useMemo(() => {
        const today = new Date();
        const start = new Date(today);
        start.setFullYear(today.getFullYear() - 1);

        const days = [];
        let current = new Date(start);

        while (current <= today) {
            const dateStr = current.toISOString().split('T')[0];
            const entry = data.find(d => d.date.split('T')[0] === dateStr);
            days.push({
                date: dateStr,
                count: entry ? entry.count : 0,
                percentage: entry ? entry.percentage : 0
            });
            current.setDate(current.getDate() + 1);
        }

        const grid = [];
        for (let i = 0; i < days.length; i += 7) {
            grid.push(days.slice(i, i + 7));
        }
        return grid;
    }, [data]);

    const getColor = (percentage) => {
        if (percentage === 0) return 'bg-secondary';
        if (percentage < 30) return 'bg-green-900/40';
        if (percentage < 60) return 'bg-green-700/60';
        if (percentage < 90) return 'bg-green-500/80';
        return 'bg-green-400';
    };

    return (
        <div className="bg-card p-6 rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold">Evolution Map</h3>
                    <p className="text-xs text-muted-foreground">Historical consistency over the last year</p>
                </div>
                <div className="flex gap-1 text-[10px] text-muted-foreground">
                    <span>Less</span>
                    <div className="w-3 h-3 bg-secondary rounded-sm"></div>
                    <div className="w-3 h-3 bg-green-900/40 rounded-sm"></div>
                    <div className="w-3 h-3 bg-green-700/60 rounded-sm"></div>
                    <div className="w-3 h-3 bg-green-500/80 rounded-sm"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
                    <span>More</span>
                </div>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-4 scrollbar-hide">
                {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-1 flex-shrink-0">
                        {week.map((day, di) => (
                            <motion.div
                                key={di}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: (wi * 7 + di) * 0.001 }}
                                className={`w-3 h-3 rounded-sm ${getColor(day.percentage)} cursor-pointer relative group`}
                            >
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                                    <div className="bg-popover text-popover-foreground text-[10px] p-2 rounded-lg shadow-xl border border-border whitespace-nowrap">
                                        <p className="font-bold">{new Date(day.date).toLocaleDateString()}</p>
                                        <p>{day.count} tasks • {day.percentage}% complete</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Heatmap;
