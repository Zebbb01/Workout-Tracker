'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Plus, Calendar, ChevronLeft, ChevronRight,
    Coffee, Sun, Moon, Cookie, Flame, Beef, Droplets, Wheat, Target
} from 'lucide-react';
import { getMealPlansAction, addMealPlanAction, deleteMealPlanAction, getUserTDEEProfileAction } from '@/lib/actions';
import MealCard from '@/components/MealCard';
import AddMealForm from '@/components/AddMealForm';

interface Meal {
    id: string;
    name: string;
    mealType: string;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    notes: string | null;
    date: Date;
}

interface TDEETargets {
    targetCalories: number;
    proteinTarget: number;
    carbsTarget: number;
    fatTarget: number;
    goal: string;
}

const mealTypeConfig = {
    breakfast: { icon: Coffee, label: 'Breakfast', color: 'text-amber-400' },
    lunch: { icon: Sun, label: 'Lunch', color: 'text-orange-400' },
    dinner: { icon: Moon, label: 'Dinner', color: 'text-blue-400' },
    snack: { icon: Cookie, label: 'Snacks', color: 'text-pink-400' },
};

const goalLabels: Record<string, { label: string; color: string }> = {
    cutting: { label: 'Cutting', color: 'text-emerald-400' },
    maintenance: { label: 'Maintain', color: 'text-blue-400' },
    bulking: { label: 'Bulking', color: 'text-amber-400' },
};

function ProgressRing({ value, max, color, size = 52 }: { value: number; max: number; color: string; size?: number }) {
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(value / max, 1);
    const strokeDashoffset = circumference - percentage * circumference;
    const isOver = value > max;

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={strokeWidth}
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={isOver ? '#ef4444' : color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
            />
        </svg>
    );
}

export default function MealsPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [meals, setMeals] = useState<Meal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedMealType, setSelectedMealType] = useState<string>('breakfast');
    const [tdeeTargets, setTdeeTargets] = useState<TDEETargets | null>(null);

    useEffect(() => {
        loadMeals();
    }, [selectedDate]);

    useEffect(() => {
        loadTDEETargets();
    }, []);

    const loadTDEETargets = async () => {
        try {
            const profile = await getUserTDEEProfileAction();
            if (profile && profile.targetCalories && profile.proteinTarget && profile.carbsTarget && profile.fatTarget) {
                setTdeeTargets({
                    targetCalories: profile.targetCalories,
                    proteinTarget: profile.proteinTarget,
                    carbsTarget: profile.carbsTarget,
                    fatTarget: profile.fatTarget,
                    goal: profile.goal || 'maintenance',
                });
            }
        } catch (error) {
            console.error('Failed to load TDEE targets:', error);
        }
    };

    const loadMeals = async () => {
        setLoading(true);
        try {
            const data = await getMealPlansAction(selectedDate);
            setMeals(data);
        } catch (error) {
            console.error('Failed to load meals:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMeal = async (mealData: {
        name: string;
        mealType: string;
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
        notes?: string;
    }) => {
        try {
            await addMealPlanAction({
                ...mealData,
                date: selectedDate,
            });
            setShowAddForm(false);
            loadMeals();
        } catch (error) {
            console.error('Failed to add meal:', error);
        }
    };

    const handleDeleteMeal = async (id: string) => {
        try {
            await deleteMealPlanAction(id);
            loadMeals();
        } catch (error) {
            console.error('Failed to delete meal:', error);
        }
    };

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const formatDate = (date: Date) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    // Calculate daily totals
    const totals = meals.reduce(
        (acc, meal) => ({
            calories: acc.calories + (meal.calories || 0),
            protein: acc.protein + (meal.protein || 0),
            carbs: acc.carbs + (meal.carbs || 0),
            fat: acc.fat + (meal.fat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const getMealsByType = (type: string) => meals.filter((m) => m.mealType === type);

    return (
        <div className="pb-8 animate-in">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-6"
            >
                <h1 className="text-2xl font-bold text-white">Meal Plan</h1>
            </motion.div>

            {/* Date Picker */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-3 flex items-center justify-between mb-6"
            >
                <button
                    onClick={() => changeDate(-1)}
                    className="p-2 text-zinc-400 hover:text-white transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>

                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-orange-500" />
                    <span className="text-white font-medium">{formatDate(selectedDate)}</span>
                </div>

                <button
                    onClick={() => changeDate(1)}
                    className="p-2 text-zinc-400 hover:text-white transition-colors"
                >
                    <ChevronRight size={20} />
                </button>
            </motion.div>

            {/* Daily Summary with TDEE Targets */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-4 mb-6"
            >
                {/* Goal Badge */}
                {tdeeTargets && (
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm text-zinc-400">Daily Summary</h3>
                        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${tdeeTargets.goal === 'cutting'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : tdeeTargets.goal === 'bulking'
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                    : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                            }`}>
                            <Target size={11} />
                            {goalLabels[tdeeTargets.goal]?.label || 'Maintain'} Goal
                        </div>
                    </div>
                )}
                {!tdeeTargets && <h3 className="text-sm text-zinc-400 mb-3">Daily Summary</h3>}

                {/* Macro cards with progress rings */}
                <div className="grid grid-cols-4 gap-3">
                    {/* Calories */}
                    <div className="text-center">
                        <div className="relative inline-flex items-center justify-center mb-1">
                            {tdeeTargets ? (
                                <>
                                    <ProgressRing
                                        value={totals.calories}
                                        max={tdeeTargets.targetCalories}
                                        color="#f97316"
                                    />
                                    <Flame className="w-4 h-4 text-orange-500 absolute" />
                                </>
                            ) : (
                                <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                            )}
                        </div>
                        <div className="text-lg font-bold text-white">{totals.calories}</div>
                        {tdeeTargets ? (
                            <div className="text-[10px] text-zinc-500">/ {tdeeTargets.targetCalories}</div>
                        ) : (
                            <div className="text-xs text-zinc-500">kcal</div>
                        )}
                    </div>

                    {/* Protein */}
                    <div className="text-center">
                        <div className="relative inline-flex items-center justify-center mb-1">
                            {tdeeTargets ? (
                                <>
                                    <ProgressRing
                                        value={totals.protein}
                                        max={tdeeTargets.proteinTarget}
                                        color="#f87171"
                                    />
                                    <Beef className="w-4 h-4 text-red-400 absolute" />
                                </>
                            ) : (
                                <Beef className="w-5 h-5 text-red-400 mx-auto mb-1" />
                            )}
                        </div>
                        <div className="text-lg font-bold text-white">{totals.protein.toFixed(0)}g</div>
                        {tdeeTargets ? (
                            <div className="text-[10px] text-zinc-500">/ {tdeeTargets.proteinTarget}g</div>
                        ) : (
                            <div className="text-xs text-zinc-500">Protein</div>
                        )}
                    </div>

                    {/* Carbs */}
                    <div className="text-center">
                        <div className="relative inline-flex items-center justify-center mb-1">
                            {tdeeTargets ? (
                                <>
                                    <ProgressRing
                                        value={totals.carbs}
                                        max={tdeeTargets.carbsTarget}
                                        color="#fbbf24"
                                    />
                                    <Wheat className="w-4 h-4 text-amber-400 absolute" />
                                </>
                            ) : (
                                <Wheat className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                            )}
                        </div>
                        <div className="text-lg font-bold text-white">{totals.carbs.toFixed(0)}g</div>
                        {tdeeTargets ? (
                            <div className="text-[10px] text-zinc-500">/ {tdeeTargets.carbsTarget}g</div>
                        ) : (
                            <div className="text-xs text-zinc-500">Carbs</div>
                        )}
                    </div>

                    {/* Fat */}
                    <div className="text-center">
                        <div className="relative inline-flex items-center justify-center mb-1">
                            {tdeeTargets ? (
                                <>
                                    <ProgressRing
                                        value={totals.fat}
                                        max={tdeeTargets.fatTarget}
                                        color="#60a5fa"
                                    />
                                    <Droplets className="w-4 h-4 text-blue-400 absolute" />
                                </>
                            ) : (
                                <Droplets className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                            )}
                        </div>
                        <div className="text-lg font-bold text-white">{totals.fat.toFixed(0)}g</div>
                        {tdeeTargets ? (
                            <div className="text-[10px] text-zinc-500">/ {tdeeTargets.fatTarget}g</div>
                        ) : (
                            <div className="text-xs text-zinc-500">Fat</div>
                        )}
                    </div>
                </div>

                {/* Remaining Calories Bar */}
                {tdeeTargets && (
                    <div className="mt-4 pt-3 border-t border-white/5">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-zinc-500">Calories remaining</span>
                            <span className={`text-xs font-medium ${totals.calories > tdeeTargets.targetCalories ? 'text-red-400' : 'text-emerald-400'
                                }`}>
                                {totals.calories > tdeeTargets.targetCalories
                                    ? `${totals.calories - tdeeTargets.targetCalories} over`
                                    : `${tdeeTargets.targetCalories - totals.calories} left`
                                }
                            </span>
                        </div>
                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((totals.calories / tdeeTargets.targetCalories) * 100, 100)}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className={`h-full rounded-full ${totals.calories > tdeeTargets.targetCalories
                                        ? 'bg-gradient-to-r from-red-500 to-red-600'
                                        : 'bg-gradient-to-r from-orange-500 to-amber-500'
                                    }`}
                            />
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Meal Sections */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(mealTypeConfig).map(([type, config], index) => {
                        const Icon = config.icon;
                        const typeMeals = getMealsByType(type);

                        return (
                            <motion.div
                                key={type}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * (index + 1) }}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <Icon className={`w-5 h-5 ${config.color}`} />
                                    <h2 className="text-lg font-semibold text-white">{config.label}</h2>
                                    <span className="text-sm text-zinc-500">({typeMeals.length})</span>
                                </div>

                                <div className="space-y-2">
                                    {typeMeals.length > 0 ? (
                                        typeMeals.map((meal) => (
                                            <MealCard
                                                key={meal.id}
                                                meal={meal}
                                                onDelete={handleDeleteMeal}
                                            />
                                        ))
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setSelectedMealType(type);
                                                setShowAddForm(true);
                                            }}
                                            className="w-full glass-card p-4 border-dashed border-zinc-700 hover:border-orange-500/50 transition-colors text-center"
                                        >
                                            <Plus className="w-5 h-5 text-zinc-500 mx-auto mb-1" />
                                            <span className="text-sm text-zinc-500">Add {config.label.toLowerCase()}</span>
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Floating Add Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                onClick={() => setShowAddForm(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-orange-500 to-red-600 rounded-full shadow-lg shadow-orange-500/30 flex items-center justify-center z-40"
            >
                <Plus className="w-6 h-6 text-white" />
            </motion.button>

            {/* Add Meal Modal */}
            {showAddForm && (
                <AddMealForm
                    defaultMealType={selectedMealType}
                    onSubmit={handleAddMeal}
                    onClose={() => setShowAddForm(false)}
                />
            )}
        </div>
    );
}
