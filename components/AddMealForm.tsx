'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coffee, Sun, Moon, Cookie, Sparkles, Loader2, Camera, Image as ImageIcon } from 'lucide-react';

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
    const [calculating, setCalculating] = useState(false);
    const [aiEstimated, setAiEstimated] = useState(false);
    const [calcError, setCalcError] = useState('');
    const [fromCache, setFromCache] = useState(false);
    const [scannedImage, setScannedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setScannedImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Auto-start scan
        handleImageScan(file);
    };

    const handleImageScan = async (file: File) => {
        setScanning(true);
        setCalcError('');
        setAiEstimated(false);

        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/api/nutrition-scan', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                setCalcError(data.error || 'Failed to scan image');
                return;
            }

            setName(data.name);
            setCalories(String(data.calories));
            setProtein(String(data.protein));
            setCarbs(String(data.carbs));
            setFat(String(data.fat));
            setAiEstimated(true);
        } catch {
            setCalcError('Network error during scanning.');
        } finally {
            setScanning(false);
        }
    };

    const handleCalculateNutrition = async () => {
        if (!name.trim()) return;

        setCalculating(true);
        setCalcError('');
        setAiEstimated(false);
        setFromCache(false);

        try {
            const response = await fetch('/api/nutrition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mealName: name.trim() }),
            });

            const data = await response.json();

            if (!response.ok) {
                setCalcError(data.error || 'Failed to calculate nutrition');
                return;
            }

            setCalories(String(data.calories));
            setProtein(String(data.protein));
            setCarbs(String(data.carbs));
            setFat(String(data.fat));
            setAiEstimated(true);
            setFromCache(data.fromCache || false);
        } catch {
            setCalcError('Network error. Please try again.');
        } finally {
            setCalculating(false);
        }
    };

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

    const hasNutritionValues = calories || protein || carbs || fat;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-md bg-zinc-900/95 border border-white/10 p-6 rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto"
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
                                onChange={(e) => {
                                    setName(e.target.value);
                                    // Reset AI status when name changes
                                    if (aiEstimated) {
                                        setAiEstimated(false);
                                        setFromCache(false);
                                    }
                                }}
                                placeholder="e.g., 2 eggs, 1 apple, 1 cup oatmeal"
                                required
                                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl pl-4 pr-12 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                            />
                            <div className="absolute right-2 top-[34px] flex gap-1">
                                <label className="p-2 text-zinc-400 hover:text-orange-400 cursor-pointer transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        onChange={handleImageChange}
                                    />
                                    <Camera size={20} />
                                </label>
                            </div>
                        </div>

                        {/* Image Preview & Scanning State */}
                        {(imagePreview || scanning) && (
                            <div className="relative rounded-xl overflow-hidden bg-zinc-900/30 border border-zinc-800 p-2">
                                {imagePreview && (
                                    <div className="relative aspect-video rounded-lg overflow-hidden flex items-center justify-center bg-black/20">
                                        <img src={imagePreview} alt="Food preview" className="object-cover w-full h-full opacity-60" />
                                        {scanning && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                                <div className="relative">
                                                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                                                    <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-purple-400 animate-pulse" />
                                                </div>
                                                <span className="text-xs font-medium text-white mt-2">AI Scanning Food...</span>
                                            </div>
                                        )}
                                        {!scanning && (
                                            <button 
                                                onClick={() => { setImagePreview(null); setScannedImage(null); }}
                                                className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-orange-500 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Calculate Nutrition Button */}
                        <div>
                            <button
                                type="button"
                                onClick={handleCalculateNutrition}
                                disabled={!name.trim() || calculating}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-500/90 hover:to-indigo-500/90 text-white border border-purple-500/30 shadow-lg shadow-purple-500/10"
                            >
                                {calculating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Calculating...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        <span>{hasNutritionValues ? 'Recalculate Nutrition' : 'Calculate Nutrition'}</span>
                                    </>
                                )}
                            </button>

                            {/* Error message */}
                            <AnimatePresence>
                                {calcError && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="text-red-400 text-xs mt-2 text-center"
                                    >
                                        {calcError}
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            {/* AI Estimated badge */}
                            <AnimatePresence>
                                {aiEstimated && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="flex items-center justify-center gap-1.5 mt-2"
                                    >
                                        <Sparkles size={12} className="text-purple-400" />
                                        <span className="text-xs text-purple-300">
                                            {fromCache ? 'Loaded from cache — instant!' : 'AI Estimated'}
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Macros Grid */}
                        <div>
                            <label className="text-sm text-zinc-400 mb-2 block">Nutrition {aiEstimated ? '(AI Filled)' : '(optional)'}</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <input
                                        type="number"
                                        value={calories}
                                        onChange={(e) => setCalories(e.target.value)}
                                        placeholder="Calories"
                                        min="0"
                                        className={`w-full bg-zinc-900/50 border rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors ${aiEstimated ? 'border-purple-500/40' : 'border-zinc-700'
                                            }`}
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
                                        className={`w-full bg-zinc-900/50 border rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors ${aiEstimated ? 'border-purple-500/40' : 'border-zinc-700'
                                            }`}
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
                                        className={`w-full bg-zinc-900/50 border rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors ${aiEstimated ? 'border-purple-500/40' : 'border-zinc-700'
                                            }`}
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
                                        className={`w-full bg-zinc-900/50 border rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors ${aiEstimated ? 'border-purple-500/40' : 'border-zinc-700'
                                            }`}
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
