'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lightbulb, X, Dumbbell, Utensils, Target, Scale,
    Trophy, ChevronRight, Sparkles, BookOpen
} from 'lucide-react';
import Link from 'next/link';

interface BeginnerTipsProps {
    hasWorkouts: boolean;
    hasMeals: boolean;
    hasTDEE: boolean;
    hasWeight: boolean;
}

const tips = [
    {
        id: 'workout',
        icon: Dumbbell,
        title: 'Log Your First Workout',
        description: 'Start by logging a simple exercise. Tap the "Log" tab and select an exercise to begin.',
        link: '/log',
        linkText: 'Start Logging',
        color: 'orange',
        completed: (props: BeginnerTipsProps) => props.hasWorkouts,
    },
    {
        id: 'tdee',
        icon: Target,
        title: 'Calculate Your TDEE',
        description: 'Know how many calories you burn daily. This helps you set the right nutrition targets.',
        link: '/tdee',
        linkText: 'Calculate Now',
        color: 'blue',
        completed: (props: BeginnerTipsProps) => props.hasTDEE,
    },
    {
        id: 'meal',
        icon: Utensils,
        title: 'Plan Your Meals',
        description: 'Track what you eat to fuel your workouts properly and reach your goals faster.',
        link: '/meals',
        linkText: 'Add Meal',
        color: 'green',
        completed: (props: BeginnerTipsProps) => props.hasMeals,
    },
    {
        id: 'weight',
        icon: Scale,
        title: 'Track Your Weight',
        description: 'Log your weight regularly to see your progress over time. Consistency is key!',
        link: '/tdee',
        linkText: 'Log Weight',
        color: 'purple',
        completed: (props: BeginnerTipsProps) => props.hasWeight,
    },
];

export default function BeginnerTips(props: BeginnerTipsProps) {
    const [dismissed, setDismissed] = useState(false);
    const [expandedTip, setExpandedTip] = useState<string | null>(null);

    // Count completed steps
    const completedCount = tips.filter(tip => tip.completed(props)).length;
    const allCompleted = completedCount === tips.length;

    // Don't show if dismissed or all completed
    if (dismissed || allCompleted) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-4 rounded-xl relative overflow-hidden mb-4"
        >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-2xl -z-10" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-orange-500 to-red-500 p-1.5 rounded-lg">
                        <Sparkles size={14} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Getting Started</h3>
                        <p className="text-[10px] text-zinc-500">{completedCount}/{tips.length} completed</p>
                    </div>
                </div>
                <button
                    onClick={() => setDismissed(true)}
                    className="text-zinc-600 hover:text-zinc-400 transition-colors p-1"
                    aria-label="Dismiss tips"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-zinc-800 rounded-full mb-4 overflow-hidden">
                <motion.div
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedCount / tips.length) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                />
            </div>

            {/* Tips list */}
            <div className="space-y-2">
                {tips.map((tip, index) => {
                    const Icon = tip.icon;
                    const isCompleted = tip.completed(props);
                    const isExpanded = expandedTip === tip.id;

                    const colorClasses = {
                        orange: 'bg-orange-500/20 text-orange-400',
                        blue: 'bg-blue-500/20 text-blue-400',
                        green: 'bg-green-500/20 text-green-400',
                        purple: 'bg-purple-500/20 text-purple-400',
                    };

                    return (
                        <motion.div
                            key={tip.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <button
                                onClick={() => setExpandedTip(isExpanded ? null : tip.id)}
                                className={`w-full text-left p-3 rounded-lg transition-all ${isCompleted
                                        ? 'bg-zinc-800/30 opacity-60'
                                        : 'bg-zinc-800/50 hover:bg-zinc-800'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${colorClasses[tip.color as keyof typeof colorClasses]}`}>
                                        <Icon size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-medium ${isCompleted ? 'text-zinc-500 line-through' : 'text-white'}`}>
                                                {tip.title}
                                            </span>
                                            {isCompleted && (
                                                <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                                                    Done
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight
                                        size={16}
                                        className={`text-zinc-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                    />
                                </div>
                            </button>

                            <AnimatePresence>
                                {isExpanded && !isCompleted && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-3 pt-2 ml-11">
                                            <p className="text-xs text-zinc-400 mb-3">{tip.description}</p>
                                            <Link
                                                href={tip.link}
                                                className="inline-flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-400 transition-colors"
                                            >
                                                {tip.linkText}
                                                <ChevronRight size={12} />
                                            </Link>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* Quick tip */}
            <div className="mt-4 pt-3 border-t border-zinc-800">
                <div className="flex items-start gap-2">
                    <Lightbulb size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-zinc-500">
                        <span className="text-amber-500 font-medium">Pro tip:</span> Start with compound exercises like squats, deadlifts, and bench press—they work multiple muscles and give you the most bang for your buck!
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
