'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coffee, Sun, Moon, Cookie } from 'lucide-react';

interface AddMealFormProps {
    defaultMealType?: string;
    onSubmit: (data: {
        name: string;
        mealType: string;
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
        notes?: string;
    }) => void;
    onClose: () => void;
}

const mealTypes = [
    { value: 'breakfast', label: 'Breakfast', icon: Coffee },
    { value: 'lunch', label: 'Lunch', icon: Sun },
    { value: 'dinner', label: 'Dinner', icon: Moon },
    { value: 'snack', label: 'Snack', icon: Cookie },
];

export default function AddMealForm({ defaultMealType = 'breakfast', onSubmit, onClose }: AddMealFormProps) {
    const [name, setName] = useState('');
    const [mealType, setMealType] = useState(defaultMealType);
    const [calories, setCalories] = useState('');
    const [protein, setProtein] = useState('');
    const [carbs, setCarbs] = useState('');
    const [fat, setFat] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await onSubmit({
                name: name.trim(),
                mealType,
                calories: calories ? parseInt(calories) : undefined,
                protein: protein ? parseFloat(protein) : undefined,
                carbs: carbs ? parseFloat(carbs) : undefined,
                fat: fat ? parseFloat(fat) : undefined,
                notes: notes.trim() || undefined,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-md glass-card p-6 rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white">Add Meal</h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-zinc-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Meal Type */}
                        <div>
                            <label className="text-sm text-zinc-400 mb-2 block">Meal Type</label>
                            <div className="grid grid-cols-4 gap-2">
                                {mealTypes.map((type) => {
                                    const Icon = type.icon;
                                    const isSelected = mealType === type.value;
                                    return (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setMealType(type.value)}
                                            className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${isSelected
                                                    ? 'bg-orange-500/20 border border-orange-500/50 text-orange-400'
                                                    : 'glass-button text-zinc-400 hover:text-white'
                                                }`}
                                        >
                                            <Icon size={20} />
                                            <span className="text-xs">{type.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="text-sm text-zinc-400 mb-2 block">Meal Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Grilled Chicken Salad"
                                required
                                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                            />
                        </div>

                        {/* Macros Grid */}
                        <div>
                            <label className="text-sm text-zinc-400 mb-2 block">Nutrition (optional)</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <input
                                        type="number"
                                        value={calories}
                                        onChange={(e) => setCalories(e.target.value)}
                                        placeholder="Calories"
                                        min="0"
                                        className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="number"
                                        value={protein}
                                        onChange={(e) => setProtein(e.target.value)}
                                        placeholder="Protein (g)"
                                        min="0"
                                        step="0.1"
                                        className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="number"
                                        value={carbs}
                                        onChange={(e) => setCarbs(e.target.value)}
                                        placeholder="Carbs (g)"
                                        min="0"
                                        step="0.1"
                                        className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="number"
                                        value={fat}
                                        onChange={(e) => setFat(e.target.value)}
                                        placeholder="Fat (g)"
                                        min="0"
                                        step="0.1"
                                        className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="text-sm text-zinc-400 mb-2 block">Notes (optional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any notes..."
                                rows={2}
                                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                            />
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold py-4 rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        >
                            {loading ? 'Adding...' : 'Add Meal'}
                        </button>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
