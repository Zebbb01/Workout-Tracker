'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import Select from '@/components/ui/Select';

interface CreateExerciseProps {
    onCreate: (name: string, category: string) => void;
    onCancel: () => void;
}

const CATEGORY_OPTIONS = [
    { id: 'Legs', label: 'Legs' },
    { id: 'Chest', label: 'Chest' },
    { id: 'Back', label: 'Back' },
    { id: 'Shoulders', label: 'Shoulders' },
    { id: 'Arms', label: 'Arms' },
    { id: 'Core', label: 'Core' },
    { id: 'Cardio', label: 'Cardio' },
    { id: 'Other', label: 'Other' },
];

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
                <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors">
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
                        className="w-full bg-black/50 border border-zinc-700 rounded-lg p-3 text-white focus:border-orange-500 outline-none transition-colors"
                        required
                        autoFocus
                    />
                </div>

                <div>
                    <Select
                        options={CATEGORY_OPTIONS}
                        value={category}
                        onChange={setCategory}
                        placeholder="Select Category"
                        label="Category"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    <Plus size={18} />
                    Create Exercise
                </button>
            </form>
        </div>
    );
}
