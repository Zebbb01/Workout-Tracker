'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
}

export default function ConfirmDialog({
    isOpen,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    isDestructive = false
}: ConfirmDialogProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
                        <motion.div
                            className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl pointer-events-auto"
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", duration: 0.3 }}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                        <AlertTriangle size={20} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">{title}</h3>
                                </div>
                                <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                                {description}
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={onCancel}
                                    className="flex-1 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700 transition-colors"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    className={`flex-1 py-2.5 rounded-lg font-bold text-white shadow-lg transition-transform active:scale-95
                                        ${isDestructive
                                            ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20'
                                            : 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20'
                                        }`}
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
