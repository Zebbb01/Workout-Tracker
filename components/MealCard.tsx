'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Flame, Beef, Wheat, Droplets } from 'lucide-react';

interface MealCardProps {
    meal: {
        id: string;
        name: string;
        mealType: string;
        calories: number | null;
        protein: number | null;
        carbs: number | null;
        fat: number | null;
        notes: string | null;
    };
    onDelete: (id: string) => void;
}

export default function MealCard({ meal, onDelete }: MealCardProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-4 group"
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">{meal.name}</h3>
                    {meal.notes && (
                        <p className="text-xs text-zinc-500 mb-2">{meal.notes}</p>
                    )}

                    {/* Macro Tags */}
                    <div className="flex flex-wrap gap-2">
                        {meal.calories && (
                            <div className="flex items-center gap-1 bg-orange-500/10 text-orange-400 px-2 py-1 rounded-md text-xs">
                                <Flame className="w-3 h-3" />
                                {meal.calories} kcal
                            </div>
                        )}
                        {meal.protein && (
                            <div className="flex items-center gap-1 bg-red-500/10 text-red-400 px-2 py-1 rounded-md text-xs">
                                <Beef className="w-3 h-3" />
                                {meal.protein}g
                            </div>
                        )}
                        {meal.carbs && (
                            <div className="flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-1 rounded-md text-xs">
                                <Wheat className="w-3 h-3" />
                                {meal.carbs}g
                            </div>
                        )}
                        {meal.fat && (
                            <div className="flex items-center gap-1 bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md text-xs">
                                <Droplets className="w-3 h-3" />
                                {meal.fat}g
                            </div>
                        )}
                    </div>
                </div>

                {/* Delete Button */}
                <button
                    onClick={() => onDelete(meal.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-500 transition-all"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}
