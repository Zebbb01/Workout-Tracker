'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, TrendingUp, Utensils, Trophy, ArrowRight, ArrowLeft } from 'lucide-react';

interface FeatureHighlightsProps {
    onComplete: () => void;
    onBack: () => void;
}

const features = [
    {
        icon: Dumbbell,
        title: 'Track Your Workouts',
        description: 'Log exercises, sets, reps, and weights with ease. Build custom routines and see your strength grow over time.',
        gradient: 'from-orange-500 to-red-500',
    },
    {
        icon: TrendingUp,
        title: 'Monitor Progress',
        description: 'Visualize your gains with detailed charts and analytics. Track weight changes, workout frequency, and personal records.',
        gradient: 'from-blue-500 to-purple-500',
    },
    {
        icon: Utensils,
        title: 'Plan Your Meals',
        description: 'Stay on top of your nutrition with meal planning. Track calories and macros to fuel your workouts properly.',
        gradient: 'from-green-500 to-emerald-500',
    },
    {
        icon: Trophy,
        title: 'Unlock Achievements',
        description: 'Stay motivated by earning badges for your consistency and milestones. Celebrate every victory on your journey.',
        gradient: 'from-yellow-500 to-orange-500',
    },
];

export default function FeatureHighlights({ onComplete, onBack }: FeatureHighlightsProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const currentFeature = features[currentIndex];
    const Icon = currentFeature.icon;

    const handleNext = () => {
        if (currentIndex < features.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onComplete();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        } else {
            onBack();
        }
    };

    return (
        <motion.div
            className="min-h-screen flex flex-col items-center justify-center p-6 bg-black relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Background Glow */}
            <motion.div
                key={currentIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full blur-[100px] -z-10 bg-gradient-to-br ${currentFeature.gradient} opacity-20`}
            />

            <div className="max-w-md w-full">
                {/* Feature Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                        className="text-center"
                    >
                        {/* Icon */}
                        <motion.div
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            className={`inline-flex p-6 rounded-3xl bg-gradient-to-br ${currentFeature.gradient} shadow-2xl mb-8`}
                        >
                            <Icon size={48} className="text-white" />
                        </motion.div>

                        {/* Title */}
                        <h2 className="text-3xl font-bold text-white mb-4">
                            {currentFeature.title}
                        </h2>

                        {/* Description */}
                        <p className="text-zinc-400 text-lg leading-relaxed mb-8 px-4">
                            {currentFeature.description}
                        </p>
                    </motion.div>
                </AnimatePresence>

                {/* Progress Dots */}
                <div className="flex justify-center gap-2 mb-10">
                    {features.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex
                                    ? 'w-8 bg-orange-500'
                                    : 'w-2 bg-zinc-700 hover:bg-zinc-600'
                                }`}
                        />
                    ))}
                </div>

                {/* Navigation Buttons */}
                <div className="flex gap-4">
                    <motion.button
                        onClick={handlePrev}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 glass-button py-4 px-6 rounded-xl text-white font-medium flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back
                    </motion.button>

                    <motion.button
                        onClick={handleNext}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold py-4 px-6 rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 group"
                    >
                        {currentIndex === features.length - 1 ? 'Get Started' : 'Next'}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}
