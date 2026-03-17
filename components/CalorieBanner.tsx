'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bell, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface CalorieBannerProps {
    consumed: number;
    target: number;
}

export default function CalorieBanner({ consumed, target }: CalorieBannerProps) {
    if (!target) return null;

    const pct = Math.min((consumed / target) * 100, 200);
    const remaining = target - consumed;
    const isOver = consumed > target;
    const isWarning = !isOver && pct >= 80;

    const config = isOver
        ? {
            icon: AlertTriangle,
            label: `Over by ${Math.abs(remaining).toFixed(0)} kcal`,
            sub: 'You\'ve exceeded your daily calorie goal',
            bg: 'bg-red-500/10',
            border: 'border-red-500/25',
            text: 'text-red-400',
            bar: 'bg-gradient-to-r from-red-500 to-red-600',
        }
        : isWarning
        ? {
            icon: TrendingUp,
            label: `${remaining.toFixed(0)} kcal remaining`,
            sub: 'Getting close — choose your next meal wisely',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/25',
            text: 'text-amber-400',
            bar: 'bg-gradient-to-r from-amber-500 to-orange-500',
        }
        : {
            icon: CheckCircle,
            label: `${remaining.toFixed(0)} kcal remaining`,
            sub: `${Math.round(pct)}% of daily goal consumed`,
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/25',
            text: 'text-emerald-400',
            bar: 'bg-gradient-to-r from-emerald-500 to-teal-500',
        };

    const Icon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${config.bg} border ${config.border} rounded-xl p-3 mb-4`}
        >
            <div className="flex items-center gap-2.5 mb-2">
                <div className={`p-1.5 rounded-lg ${config.bg}`}>
                    <Icon className={`w-4 h-4 ${config.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${config.text}`}>{config.label}</p>
                    <p className="text-xs text-zinc-500 truncate">{config.sub}</p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-xs text-zinc-500">Target</p>
                    <p className="text-xs font-bold text-white">{target} kcal</p>
                </div>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${config.bar}`}
                />
            </div>
        </motion.div>
    );
}
