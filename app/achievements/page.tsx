'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Lock, Dumbbell, Utensils, Scale, Flame, Star, Target, Medal, Award } from 'lucide-react';
import { getAllAchievementsAction, getUserAchievementsAction } from '@/lib/actions';

interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    requirement: number;
    unlockedAt?: Date;
}

const iconMap: { [key: string]: any } = {
    '🏋️': Dumbbell,
    '🍽️': Utensils,
    '⚖️': Scale,
    '🔥': Flame,
    '⭐': Star,
    '🎯': Target,
    '🏅': Medal,
    '🏆': Trophy,
    '🥇': Award,
};

const categoryConfig = {
    all: { label: 'All', color: 'text-white' },
    workout: { label: 'Workouts', color: 'text-orange-400' },
    meals: { label: 'Meals', color: 'text-green-400' },
    weight: { label: 'Weight', color: 'text-blue-400' },
    streak: { label: 'Streaks', color: 'text-purple-400' },
};

export default function AchievementsPage() {
    const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
    const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAchievements();
    }, []);

    const loadAchievements = async () => {
        setLoading(true);
        try {
            const [all, unlocked] = await Promise.all([
                getAllAchievementsAction(),
                getUserAchievementsAction()
            ]);
            setAllAchievements(all);
            setUnlockedAchievements(unlocked);
        } catch (error) {
            console.error('Failed to load achievements:', error);
        } finally {
            setLoading(false);
        }
    };

    const unlockedIds = new Set(unlockedAchievements.map(a => a.id));

    const filteredAchievements = allAchievements.filter(
        a => selectedCategory === 'all' || a.category === selectedCategory
    );

    const getUnlockDate = (id: string) => {
        const unlocked = unlockedAchievements.find(a => a.id === id);
        return unlocked?.unlockedAt;
    };

    return (
        <div className="pb-8 animate-in">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-6"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-2 rounded-xl">
                        <Trophy size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Achievements</h1>
                        <p className="text-sm text-zinc-500">
                            {unlockedAchievements.length}/{allAchievements.length} unlocked
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Category Tabs */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide"
            >
                {Object.entries(categoryConfig).map(([key, config]) => (
                    <button
                        key={key}
                        onClick={() => setSelectedCategory(key)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === key
                                ? 'bg-orange-500 text-white'
                                : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
                            }`}
                    >
                        {config.label}
                    </button>
                ))}
            </motion.div>

            {/* Achievements Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filteredAchievements.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                >
                    <Trophy className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-500">No achievements in this category yet.</p>
                    <p className="text-sm text-zinc-600 mt-1">Keep working out to unlock achievements!</p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    <AnimatePresence mode="popLayout">
                        {filteredAchievements.map((achievement, index) => {
                            const isUnlocked = unlockedIds.has(achievement.id);
                            const IconComponent = iconMap[achievement.icon] || Trophy;
                            const unlockDate = getUnlockDate(achievement.id);

                            return (
                                <motion.div
                                    key={achievement.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`glass-card p-4 relative overflow-hidden ${isUnlocked ? '' : 'opacity-60'
                                        }`}
                                >
                                    {/* Lock overlay */}
                                    {!isUnlocked && (
                                        <div className="absolute top-2 right-2">
                                            <Lock size={14} className="text-zinc-600" />
                                        </div>
                                    )}

                                    {/* Icon */}
                                    <div
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${isUnlocked
                                                ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
                                                : 'bg-zinc-800'
                                            }`}
                                    >
                                        <IconComponent
                                            size={24}
                                            className={isUnlocked ? 'text-white' : 'text-zinc-600'}
                                        />
                                    </div>

                                    {/* Info */}
                                    <h3 className={`font-semibold mb-1 text-sm ${isUnlocked ? 'text-white' : 'text-zinc-500'
                                        }`}>
                                        {achievement.name}
                                    </h3>
                                    <p className="text-xs text-zinc-500 line-clamp-2">
                                        {achievement.description}
                                    </p>

                                    {/* Unlock date */}
                                    {isUnlocked && unlockDate && (
                                        <p className="text-xs text-orange-500 mt-2">
                                            Unlocked {new Date(unlockDate).toLocaleDateString()}
                                        </p>
                                    )}

                                    {/* Shine effect for unlocked */}
                                    {isUnlocked && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shine pointer-events-none" />
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
