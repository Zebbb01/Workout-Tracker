'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Plus, Calendar, ChevronLeft, ChevronRight,
    Coffee, Sun, Moon, Cookie, Flame, Beef, Droplets, Wheat
} from 'lucide-react';
import { getMealPlansAction, addMealPlanAction, deleteMealPlanAction } from '@/lib/actions';
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

const mealTypeConfig = {
    breakfast: { icon: Coffee, label: 'Breakfast', color: 'text-amber-400' },
    lunch: { icon: Sun, label: 'Lunch', color: 'text-orange-400' },
    dinner: { icon: Moon, label: 'Dinner', color: 'text-blue-400' },
    snack: { icon: Cookie, label: 'Snacks', color: 'text-pink-400' },
};

export default function MealsPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [meals, setMeals] = useState<Meal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedMealType, setSelectedMealType] = useState<string>('breakfast');

    useEffect(() => {
        loadMeals();
    }, [selectedDate]);

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

            {/* Daily Summary */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-4 mb-6"
            >
                <h3 className="text-sm text-zinc-400 mb-3">Daily Summary</h3>
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
