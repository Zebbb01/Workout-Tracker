'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface CreateExerciseProps {
    onCreate: (name: string, category: string) => void;
    onCancel: () => void;
}

export default function CreateExercise({ onCreate, onCancel }: CreateExerciseProps) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('Other');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onCreate(name, category);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl animate-in space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-white font-semibold">Create New Exercise</h3>
                <button onClick={onCancel} className="text-zinc-500 hover:text-white">
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Exercise Name (e.g. Donkey Kicks)"
                        className="w-full bg-black/50 border border-zinc-700 rounded-lg p-3 text-white focus:border-orange-500 outline-none"
                        required
                        autoFocus
                    />
                </div>

                <div>
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full bg-black/50 border border-zinc-700 rounded-lg p-3 text-white focus:border-orange-500 outline-none"
                    >
                        <option value="Legs">Legs</option>
                        <option value="Chest">Chest</option>
                        <option value="Back">Back</option>
                        <option value="Shoulders">Shoulders</option>
                        <option value="Arms">Arms</option>
                        <option value="Core">Core</option>
                        <option value="Cardio">Cardio</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <button
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    <Plus size={18} />
                    Create Exercise
                </button>
            </form>
        </div>
    );
}
