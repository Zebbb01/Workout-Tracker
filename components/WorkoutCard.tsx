'use client';

import React from 'react';
import { WorkoutSet } from '@/lib/types';
import { Trash2 } from 'lucide-react';
import ConfirmDialog from './ui/ConfirmDialog';

interface WorkoutCardProps {
    workout: WorkoutSet;
    isPR?: boolean;
    onDelete: () => void;
}

export default function WorkoutCard({ workout, isPR, onDelete }: WorkoutCardProps) {
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

    const handleDeleteClick = () => {
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = () => {
        onDelete();
        setShowDeleteDialog(false);
    };

    const getTypeColor = () => {
        switch (workout.type) {
            case 'warmup': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
            case 'drop': return 'bg-red-500/20 text-red-500 border-red-500/30';
            case 'failure': return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
            default: return 'bg-slate-800 text-orange-300 border-transparent';
        }
    };

    return (
        <>
            <div className={`glass-card p-4 flex items-center justify-between ${isPR ? 'bg-amber-500/5 border-amber-900/30' : ''}`}>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white">{workout.exerciseName}</h4>
                        {isPR && <span className="text-[10px] font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded shadow-lg shadow-amber-500/20">PR</span>}
                        {workout.type && workout.type !== 'normal' && (
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${getTypeColor()}`}>
                                {workout.type}
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-slate-400 mt-1 flex gap-3">
                        <span className={`px-2 py-0.5 rounded ${getTypeColor()}`}>
                            {workout.totalWeight}kg
                        </span>
                        <span>
                            {workout.sets} sets × {workout.reps} reps
                        </span>
                    </div>
                    {workout.notes && (
                        <p className="text-xs text-slate-500 mt-2 italic">{workout.notes}</p>
                    )}
                </div>

                <button
                    onClick={handleDeleteClick}
                    className="text-zinc-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                    aria-label="Delete workout"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            <ConfirmDialog
                isOpen={showDeleteDialog}
                onCancel={() => setShowDeleteDialog(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Log"
                description="Are you sure you want to delete this workout entry? This cannot be undone."
                confirmText="Delete"
                isDestructive
            />
        </>
    );
}
