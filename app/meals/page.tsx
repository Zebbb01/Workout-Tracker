'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
    Plus, Calendar, ChevronLeft, ChevronRight,
    Coffee, Sun, Moon, Cookie, Flame, Beef, Droplets, Wheat, Target
} from 'lucide-react';
import { getMealPlansAction, addMealPlanAction, deleteMealPlanAction, getUserTDEEProfileAction } from '@/lib/actions';
import MealCard from '@/components/MealCard';
import AddMealForm from '@/components/AddMealForm';
import FastingWidget from '@/components/FastingWidget';
import CalorieBanner from '@/components/CalorieBanner';
import MacroHalfPie from '@/components/MacroHalfPie';
import { useMeals, useTDEE } from '@/lib/cache';

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
    const { meals, refresh: refreshMeals, isLoading: isMealsLoading } = useMeals();
    const { tdeeProfile: profile, refresh: refreshTDEE, isLoading: isTDEELoading } = useTDEE();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedMealType, setSelectedMealType] = useState<string>('breakfast');

    useEffect(() => {
        refreshMeals(false);
    }, [refreshMeals]);

    const tdeeTargets = profile && profile.targetCalories ? {
        targetCalories: profile.targetCalories,
        proteinTarget: profile.proteinTarget,
        carbsTarget: profile.carbsTarget,
        fatTarget: profile.fatTarget,
        goal: profile.goal || 'maintenance',
    } : null;

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
            refreshMeals(true);
        } catch (error) {
            console.error('Failed to add meal:', error);
        }
    };

    const handleDeleteMeal = async (id: string) => {
        try {
            await deleteMealPlanAction(id);
            refreshMeals(true);
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

    // Filter meals by selected date locally
    const filteredMeals = meals.filter(m => {
        const mealDate = new Date(m.date);
        return mealDate.toDateString() === selectedDate.toDateString();
    });

    // Calculate daily totals
    const totals = filteredMeals.reduce(
        (acc, meal) => ({
            calories: acc.calories + (meal.calories || 0),
            protein: acc.protein + (meal.protein || 0),
            carbs: acc.carbs + (meal.carbs || 0),
            fat: acc.fat + (meal.fat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const getMealsByType = (type: string) => filteredMeals.filter((m) => m.mealType === type);

    return (
        <div className="pb-24 animate-in">
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

                {/* Half-Pie chart when TDEE targets available, else simple grid */}
                {tdeeTargets ? (
                    <MacroHalfPie
                        calories={totals.calories}
                        protein={totals.protein}
                        carbs={totals.carbs}
                        fat={totals.fat}
                        targetCalories={tdeeTargets.targetCalories}
                        proteinTarget={tdeeTargets.proteinTarget}
                        carbsTarget={tdeeTargets.carbsTarget}
                        fatTarget={tdeeTargets.fatTarget}
                    />
                ) : (
                    <div className="grid grid-cols-4 gap-3">
                        <div className="text-center">
                            <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                            <div className="text-lg font-bold text-white">{totals.calories}</div>
                            <div className="text-xs text-zinc-500">kcal</div>
                        </div>
                        <div className="text-center">
                            <Beef className="w-5 h-5 text-red-400 mx-auto mb-1" />
                            <div className="text-lg font-bold text-white">{totals.protein.toFixed(0)}g</div>
                            <div className="text-xs text-zinc-500">Protein</div>
                        </div>
                        <div className="text-center">
                            <Wheat className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                            <div className="text-lg font-bold text-white">{totals.carbs.toFixed(0)}g</div>
                            <div className="text-xs text-zinc-500">Carbs</div>
                        </div>
                        <div className="text-center">
                            <Droplets className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                            <div className="text-lg font-bold text-white">{totals.fat.toFixed(0)}g</div>
                            <div className="text-xs text-zinc-500">Fat</div>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Fasting Tracker */}
            <FastingWidget />

            {/* Calorie Limit Banner */}
            {tdeeTargets && (
                <CalorieBanner
                    consumed={totals.calories}
                    target={tdeeTargets.targetCalories}
                />
            )}

            {/* Meal Sections */}
            {isMealsLoading && meals.length === 0 ? (
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
                                        <>
                                            {typeMeals.map((meal) => (
                                                <MealCard
                                                    key={meal.id}
                                                    meal={meal}
                                                    onDelete={handleDeleteMeal}
                                                />
                                            ))}
                                            <button
                                                onClick={() => {
                                                    setSelectedMealType(type);
                                                    setShowAddForm(true);
                                                }}
                                                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-zinc-700/60 hover:border-orange-500/40 text-zinc-500 hover:text-orange-400 transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                                <span className="text-xs">Add another {config.label.toLowerCase()}</span>
                                            </button>
                                        </>
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

            {/* Floating Add Button — rendered via portal to escape template transform */}
            {typeof document !== 'undefined' && createPortal(
                <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    onClick={() => setShowAddForm(true)}
                    className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-orange-500 to-red-600 rounded-full shadow-lg shadow-orange-500/30 flex items-center justify-center z-40"
                    style={{ transform: 'none' }}
                >
                    <Plus className="w-6 h-6 text-white" />
                </motion.button>,
                document.body
            )}

            {/* Add Meal Modal — rendered via portal to escape template transform */}
            {showAddForm && typeof document !== 'undefined' && createPortal(
                <AddMealForm
                    defaultMealType={selectedMealType}
                    onSubmit={handleAddMeal}
                    onClose={() => setShowAddForm(false)}
                />,
                document.body
            )}
        </div>
    );
}
