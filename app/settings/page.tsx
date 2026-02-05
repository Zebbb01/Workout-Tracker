'use client';

import React, { useState, useEffect } from 'react';
import {
    getUserProfileAction,
    updateUserProfileAction,
    deleteAccountAction,
    signOutAction
} from '@/lib/actions';
import { User, LogOut, Trash2, Save, ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function SettingsPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<{ name: string | null, email: string | null, image: string | null } | null>(null);
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getUserProfileAction();
                if (!data) {
                    // User authenticates but record is missing in DB (e.g. after DB switch)
                    console.warn("User profile not found. Signing out.");
                    await signOutAction();
                    return;
                }
                setProfile(data);
                if (data?.name) setName(data.name);
            } catch (e) {
                console.error("Failed to load profile", e);
            }
        };
        load();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await updateUserProfileAction(name);
        setIsSaving(false);
        // Could replace this alert with a toast, but keeping simple for now or use the dialog?
        // Let's use a simple window alert or we can make a Toast later. User asked for "modern alert" 
        // usually implies confirmation dialogs. A success toast is different.
        alert('Profile updated!');
    };

    const handleLogout = async () => {
        await signOutAction();
    };

    const handleDeleteClick = () => {
        setShowDeleteDialog(true);
    };

    const confirmDeleteAccount = async () => {
        await deleteAccountAction();
        await signOutAction(); // Ensure session is cleared server-side (if that's what this does)
        window.location.href = '/login';
    };

    if (!profile) return <div className="p-8 text-center text-zinc-500">Loading settings...</div>;

    return (
        <div className="space-y-8 pb-24 animate-in">
            <header className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Link href="/" className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
            </header>

            {/* Profile Section */}
            <section className="glass-card p-6 rounded-xl space-y-6">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-orange-600/20 flex items-center justify-center text-orange-500 border border-orange-600/30 overflow-hidden">
                        {profile.image ? (
                            <img src={profile.image} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                            <User size={32} />
                        )}
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-lg">{profile.name || 'User'}</h2>
                        <p className="text-zinc-500 text-sm">{profile.email}</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Display Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg p-3 text-white focus:border-orange-500 outline-none transition-colors"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                        <Save size={18} />
                        {isSaving ? 'Saving...' : 'Update Profile'}
                    </button>
                </form>
            </section>

            {/* Account Actions */}
            <section className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-widest px-1">Account</h3>

                <button
                    onClick={handleLogout}
                    className="w-full glass-card p-4 rounded-xl flex items-center gap-3 text-zinc-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                >
                    <div className="bg-zinc-800 p-2 rounded-lg">
                        <LogOut size={20} />
                    </div>
                    <span className="font-medium">Sign Out / Switch Account</span>
                </button>

                <button
                    onClick={handleDeleteClick}
                    className="w-full glass-card p-4 rounded-xl flex items-center gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left border border-transparent hover:border-red-500/30"
                >
                    <div className="bg-red-900/20 p-2 rounded-lg">
                        <Trash2 size={20} />
                    </div>
                    <div>
                        <span className="font-bold block">Delete Account</span>
                        <span className="text-xs text-red-500/70">Permanently remove all data</span>
                    </div>
                </button>
            </section>

            <ConfirmDialog
                isOpen={showDeleteDialog}
                onCancel={() => setShowDeleteDialog(false)}
                onConfirm={confirmDeleteAccount}
                title="Delete Account"
                description="This will permanently delete your account and all workout history. This action cannot be undone."
                confirmText="PERMANENTLY DELETE"
                isDestructive
            />
        </div>
    );
}
