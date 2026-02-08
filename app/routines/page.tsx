'use client';

import React, { useState, useEffect } from 'react';
import { useExercises } from '@/lib/useExercises';
import { getRoutinesAction, saveRoutineAction, deleteRoutineAction, updateRoutineAction } from '@/lib/actions';
import { Routine } from '@/lib/types';
import { Plus, Trash2, ChevronRight, Dumbbell, Play, Settings, Edit2, X } from 'lucide-react';
import Link from 'next/link';

export default function RoutinesPage() {
    const { exercises } = useExercises();
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);

    // Expansion State
    const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(null);

    // Creation/Edit State
    const [routineName, setRoutineName] = useState('');
    const [selectedExIds, setSelectedExIds] = useState<string[]>([]);

    const loadRoutines = async () => {
        const data = await getRoutinesAction();
        setRoutines(data);
    };

    useEffect(() => {
        loadRoutines();
    }, []);

    const startCreating = () => {
        setRoutineName('');
        setSelectedExIds([]);
        setEditingRoutine(null);
        setIsCreating(true);
    };

    const startEditing = (routine: Routine) => {
        setRoutineName(routine.name);
        setSelectedExIds(routine.exerciseIds);
        setEditingRoutine(routine);
        setIsCreating(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!routineName || selectedExIds.length === 0) return;

        if (editingRoutine) {
            await updateRoutineAction(editingRoutine.id, routineName, selectedExIds);
        } else {
            await saveRoutineAction(routineName, selectedExIds);
        }

        loadRoutines();

        // Reset
        setRoutineName('');
        setSelectedExIds([]);
        setEditingRoutine(null);
        setIsCreating(false);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('Delete this routine?')) {
            await deleteRoutineAction(id);
            loadRoutines();
        }
    };

    const toggleSelection = (id: string) => {
        if (selectedExIds.includes(id)) {
            setSelectedExIds(prev => prev.filter(x => x !== id));
        } else {
            setSelectedExIds(prev => [...prev, id]);
        }
    };

    return (
        <div className="space-y-6 pb-24 animate-in">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-white">Routines</h1>
                    <p className="text-zinc-500 text-xs">Manage your workout plans</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/settings" className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-xl border border-zinc-700 transition-colors text-zinc-400 hover:text-white flex items-center justify-center">
                        <Settings size={22} />
                    </Link>
                    {!isCreating && (
                        <button
                            onClick={startCreating}
                            className="bg-orange-600 hover:bg-orange-500 text-white p-2 rounded-xl transition-colors shadow-lg shadow-orange-600/20"
                        >
                            <Plus size={24} />
                        </button>
                    )}
                </div>
            </header>

            {isCreating ? (
                <form onSubmit={handleSave} className="glass-card p-4 rounded-xl space-y-4">
                    <h3 className="text-white font-semibold">{editingRoutine ? 'Edit Routine' : 'New Routine'}</h3>

                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Routine Name</label>
                        <input
                            type="text"
                            value={routineName}
                            onChange={e => setRoutineName(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg p-3 text-white focus:border-orange-500 outline-none"
                            placeholder="e.g. Leg Day Destruction"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-zinc-500 mb-2">Select Exercises ({selectedExIds.length})</label>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                            {exercises.map(ex => (
                                <div
                                    key={ex.id}
                                    onClick={() => toggleSelection(ex.id)}
                                    className={`p-3 rounded-lg border flex justify-between items-center cursor-pointer transition-all
                                        ${selectedExIds.includes(ex.id)
                                            ? 'bg-orange-500/10 border-orange-500 text-orange-200'
                                            : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800'}
                                    `}
                                >
                                    <span className="text-sm font-medium">{ex.name}</span>
                                    {selectedExIds.includes(ex.id) && <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="flex-1 bg-zinc-800 py-3 rounded-lg text-zinc-400 font-medium hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-orange-500/20"
                        >
                            {editingRoutine ? 'Update Routine' : 'Save Routine'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="space-y-4">
                    {routines.map(routine => {
                        const isExpanded = expandedRoutineId === routine.id;
                        const visibleExercises = isExpanded ? routine.exerciseIds : routine.exerciseIds.slice(0, 3);

                        return (
                            <div key={routine.id} className="glass-card p-5 rounded-xl group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 transition-all">
                                    <button onClick={() => startEditing(routine)} className="text-zinc-600 hover:text-orange-500 transition-colors">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={(e) => handleDelete(routine.id, e)} className="text-zinc-600 hover:text-red-500 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-white">{routine.name}</h3>
                                    <p className="text-xs text-zinc-500">{routine.exerciseIds.length} Exercises</p>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    {visibleExercises.map(id => {
                                        const ex = exercises.find(e => e.id === id);
                                        return ex ? (
                                            <span key={id} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded border border-zinc-700">
                                                {ex.name}
                                            </span>
                                        ) : null;
                                    })}
                                    {!isExpanded && routine.exerciseIds.length > 3 && (
                                        <button
                                            onClick={() => setExpandedRoutineId(routine.id)}
                                            className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-1 rounded hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
                                        >
                                            +{routine.exerciseIds.length - 3} more
                                        </button>
                                    )}
                                    {isExpanded && (
                                        <button
                                            onClick={() => setExpandedRoutineId(null)}
                                            className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-1 rounded hover:bg-zinc-700 hover:text-zinc-300 transition-colors flex items-center gap-1"
                                        >
                                            Show less <X size={10} />
                                        </button>
                                    )}
                                </div>

                                <Link href={`/log?routine=${routine.id}`} className="block w-full">
                                    <button className="w-full bg-orange-600/10 hover:bg-orange-600/20 border border-orange-600/30 text-orange-500 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all group-hover:bg-orange-600 group-hover:text-white">
                                        <Play size={16} /> Start Workout
                                    </button>
                                </Link>
                            </div>
                        );
                    })}

                    {routines.length === 0 && (
                        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
                            <div className="bg-zinc-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-600">
                                <Dumbbell size={20} />
                            </div>
                            <p className="text-zinc-500 text-sm">No routines created yet.</p>
                            <button onClick={startCreating} className="text-orange-500 text-xs font-bold mt-2 hover:underline">
                                Create your first routine
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
