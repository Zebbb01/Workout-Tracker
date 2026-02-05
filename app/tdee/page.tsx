'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Flame, Activity, Scale, Ruler, Calendar, User,
    Save, Target, TrendingDown, TrendingUp, Minus, Dumbbell,
    Utensils, Zap, Check, ChevronDown, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    calculateComplete,
    lbsToKg,
    feetInchesToCm,
    kgToLbs,
    cmToFeetInches,
    ActivityLevel,
    Gender,
    ACTIVITY_LABELS,
    TDEEResult,
} from '@/lib/tdee';
import {
    getUserTDEEProfileAction,
    saveUserTDEEProfileAction,
    getWeightEntriesAction,
    saveWeightEntryAction,
} from '@/lib/actions';

type UnitSystem = 'imperial' | 'metric';
type Goal = 'cutting' | 'maintenance' | 'bulking';

interface WeightEntry {
    id: string;
    weightKg: number;
    bodyFatPct: number | null;
    date: string;
}

const GOAL_INFO: Record<Goal, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
    cutting: {
        label: 'Cut',
        icon: <TrendingDown size={18} />,
        color: 'emerald',
        desc: '-500 cal deficit for fat loss'
    },
    maintenance: {
        label: 'Maintain',
        icon: <Minus size={18} />,
        color: 'blue',
        desc: 'Stay at current weight'
    },
    bulking: {
        label: 'Bulk',
        icon: <TrendingUp size={18} />,
        color: 'amber',
        desc: '+500 cal surplus for muscle gain'
    },
};

export default function TDEEPage() {
    const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
    const [age, setAge] = useState<string>('');
    const [gender, setGender] = useState<Gender>('male');
    const [goal, setGoal] = useState<Goal>('maintenance');

    // Metric values (stored internally)
    const [weightKg, setWeightKg] = useState<string>('');
    const [heightCm, setHeightCm] = useState<string>('');
    const [bodyFatPct, setBodyFatPct] = useState<string>('');

    // Imperial display values
    const [weightLbs, setWeightLbs] = useState<string>('');
    const [heightFeet, setHeightFeet] = useState<string>('');
    const [heightInches, setHeightInches] = useState<string>('');

    const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
    const [showResults, setShowResults] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
    const [hasExistingProfile, setHasExistingProfile] = useState(false);
    const [showActivityDropdown, setShowActivityDropdown] = useState(false);

    // Load existing profile on mount
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const profile = await getUserTDEEProfileAction();
                if (profile) {
                    setHasExistingProfile(true);
                    if (profile.age) setAge(profile.age.toString());
                    if (profile.gender) setGender(profile.gender as Gender);
                    if (profile.activityLevel) setActivityLevel(profile.activityLevel as ActivityLevel);
                    if (profile.goal) setGoal(profile.goal as Goal);
                    if (profile.useImperial) setUnitSystem('imperial');
                    if (profile.bodyFatPct) setBodyFatPct(profile.bodyFatPct.toString());

                    if (profile.heightCm && profile.weightKg) {
                        setHeightCm(profile.heightCm.toString());
                        setWeightKg(profile.weightKg.toString());

                        if (profile.useImperial) {
                            const lbs = kgToLbs(profile.weightKg);
                            const { feet, inches } = cmToFeetInches(profile.heightCm);
                            setWeightLbs(lbs.toFixed(1));
                            setHeightFeet(feet.toString());
                            setHeightInches(inches.toString());
                        }
                        setShowResults(true);
                    }
                }

                const entries = await getWeightEntriesAction(10);
                setWeightEntries(entries as WeightEntry[]);
            } catch (e) {
                console.error('Failed to load profile', e);
            }
        };
        loadProfile();
    }, []);

    // Calculate results
    const results: TDEEResult | null = useMemo(() => {
        const ageNum = parseInt(age);
        let weight: number;
        let height: number;

        if (unitSystem === 'metric') {
            weight = parseFloat(weightKg);
            height = parseFloat(heightCm);
        } else {
            weight = lbsToKg(parseFloat(weightLbs));
            height = feetInchesToCm(parseInt(heightFeet) || 0, parseInt(heightInches) || 0);
        }

        if (!ageNum || !weight || !height || ageNum < 15 || ageNum > 100) {
            return null;
        }

        return calculateComplete({
            age: ageNum,
            gender,
            weight,
            height,
            activityLevel,
        });
    }, [age, gender, weightKg, heightCm, weightLbs, heightFeet, heightInches, activityLevel, unitSystem]);

    // Calculate goal-specific values
    const goalCalories = useMemo(() => {
        if (!results) return 0;
        switch (goal) {
            case 'cutting': return results.cutting;
            case 'bulking': return results.bulking;
            default: return results.maintenance;
        }
    }, [results, goal]);

    // Calculate body composition
    const bodyComposition = useMemo(() => {
        const weight = unitSystem === 'metric' ? parseFloat(weightKg) : lbsToKg(parseFloat(weightLbs));
        const bf = parseFloat(bodyFatPct);

        if (!weight || isNaN(weight)) return null;

        if (bf && !isNaN(bf) && bf > 0 && bf < 100) {
            const fatMass = weight * (bf / 100);
            const leanMass = weight - fatMass;
            // Protein: 1.6-2.2g per kg lean mass
            const proteinMin = Math.round(leanMass * 1.6);
            const proteinMax = Math.round(leanMass * 2.2);
            return { fatMass, leanMass, proteinMin, proteinMax, bodyFatPct: bf };
        }

        // Estimate without body fat (use weight-based protein)
        const proteinMin = Math.round(weight * 1.6);
        const proteinMax = Math.round(weight * 2.2);
        return { fatMass: null, leanMass: null, proteinMin, proteinMax, bodyFatPct: null };
    }, [weightKg, weightLbs, bodyFatPct, unitSystem]);

    // Handle unit system toggle
    const handleUnitToggle = (newSystem: UnitSystem) => {
        if (newSystem === unitSystem) return;

        if (newSystem === 'imperial' && weightKg && heightCm) {
            const lbs = kgToLbs(parseFloat(weightKg));
            const { feet, inches } = cmToFeetInches(parseFloat(heightCm));
            setWeightLbs(lbs.toFixed(1));
            setHeightFeet(feet.toString());
            setHeightInches(inches.toString());
        } else if (newSystem === 'metric' && weightLbs) {
            const kg = lbsToKg(parseFloat(weightLbs));
            const cm = feetInchesToCm(parseInt(heightFeet) || 0, parseInt(heightInches) || 0);
            setWeightKg(kg.toFixed(1));
            setHeightCm(cm.toFixed(0));
        }

        setUnitSystem(newSystem);
    };

    const handleCalculate = () => {
        if (results) {
            setShowResults(true);
        }
    };

    const handleSaveProfile = async () => {
        if (!results) return;

        setIsSaving(true);
        setSaveSuccess(false);

        try {
            const weight = unitSystem === 'metric' ? parseFloat(weightKg) : lbsToKg(parseFloat(weightLbs));
            const height = unitSystem === 'metric' ? parseFloat(heightCm) : feetInchesToCm(parseInt(heightFeet) || 0, parseInt(heightInches) || 0);
            const bf = parseFloat(bodyFatPct);

            await saveUserTDEEProfileAction({
                heightCm: height,
                weightKg: weight,
                age: parseInt(age),
                gender,
                activityLevel,
                bodyFatPct: !isNaN(bf) ? bf : undefined,
                bmr: results.bmr,
                tdee: results.tdee,
                goal,
                targetCalories: goalCalories,
                proteinTarget: results.macros.protein,
                carbsTarget: results.macros.carbs,
                fatTarget: results.macros.fat,
                useImperial: unitSystem === 'imperial',
            });

            // Also save weight entry
            await saveWeightEntryAction(weight, !isNaN(bf) ? bf : undefined);

            setSaveSuccess(true);
            setHasExistingProfile(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (e) {
            console.error('Failed to save profile', e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 pb-24 animate-in">
            {/* Header */}
            <header className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Link href="/" className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white">TDEE Calculator</h1>
                    <p className="text-zinc-500 text-xs">Learn how many calories you burn every day</p>
                </div>
                {hasExistingProfile && (
                    <div className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full border border-emerald-500/30">
                        Saved
                    </div>
                )}
            </header>

            {/* Unit Toggle */}
            <div className="flex bg-zinc-900/50 rounded-lg p-1 border border-zinc-800">
                <button
                    onClick={() => handleUnitToggle('imperial')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${unitSystem === 'imperial'
                            ? 'bg-orange-600 text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                >
                    Imperial
                </button>
                <button
                    onClick={() => handleUnitToggle('metric')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${unitSystem === 'metric'
                            ? 'bg-orange-600 text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                >
                    Metric
                </button>
            </div>

            {/* Input Form */}
            <div className="glass-card p-5 rounded-xl space-y-5">
                {/* Gender */}
                <div>
                    <label className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                        <User size={14} /> Gender
                    </label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setGender('male')}
                            className={`flex-1 py-3 rounded-lg font-medium transition-all ${gender === 'male'
                                    ? 'bg-orange-600/20 text-orange-400 border border-orange-600/50'
                                    : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                                }`}
                        >
                            Male
                        </button>
                        <button
                            onClick={() => setGender('female')}
                            className={`flex-1 py-3 rounded-lg font-medium transition-all ${gender === 'female'
                                    ? 'bg-orange-600/20 text-orange-400 border border-orange-600/50'
                                    : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                                }`}
                        >
                            Female
                        </button>
                    </div>
                </div>

                {/* Age */}
                <div>
                    <label className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                        <Calendar size={14} /> Age
                    </label>
                    <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="Years"
                        min={15}
                        max={100}
                        className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg p-3 text-white focus:border-orange-500 outline-none transition-colors"
                    />
                </div>

                {/* Weight */}
                <div>
                    <label className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                        <Scale size={14} /> Weight
                    </label>
                    {unitSystem === 'metric' ? (
                        <div className="relative">
                            <input
                                type="number"
                                value={weightKg}
                                onChange={(e) => setWeightKg(e.target.value)}
                                placeholder="Weight"
                                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg p-3 pr-12 text-white focus:border-orange-500 outline-none transition-colors"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">kg</span>
                        </div>
                    ) : (
                        <div className="relative">
                            <input
                                type="number"
                                value={weightLbs}
                                onChange={(e) => setWeightLbs(e.target.value)}
                                placeholder="Weight"
                                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg p-3 pr-12 text-white focus:border-orange-500 outline-none transition-colors"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">lbs</span>
                        </div>
                    )}
                </div>

                {/* Height */}
                <div>
                    <label className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                        <Ruler size={14} /> Height
                    </label>
                    {unitSystem === 'metric' ? (
                        <div className="relative">
                            <input
                                type="number"
                                value={heightCm}
                                onChange={(e) => setHeightCm(e.target.value)}
                                placeholder="Height"
                                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg p-3 pr-12 text-white focus:border-orange-500 outline-none transition-colors"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">cm</span>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    value={heightFeet}
                                    onChange={(e) => setHeightFeet(e.target.value)}
                                    placeholder="Feet"
                                    className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg p-3 pr-10 text-white focus:border-orange-500 outline-none transition-colors"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">ft</span>
                            </div>
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    value={heightInches}
                                    onChange={(e) => setHeightInches(e.target.value)}
                                    placeholder="Inches"
                                    className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg p-3 pr-10 text-white focus:border-orange-500 outline-none transition-colors"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">in</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Body Fat % (Optional) */}
                <div>
                    <label className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                        <Activity size={14} /> Body Fat % <span className="text-zinc-600">(optional)</span>
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={bodyFatPct}
                            onChange={(e) => setBodyFatPct(e.target.value)}
                            placeholder="e.g. 15"
                            min={3}
                            max={60}
                            className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg p-3 pr-12 text-white focus:border-orange-500 outline-none transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">%</span>
                    </div>
                </div>

                {/* Activity Level - Custom Dropdown */}
                <div>
                    <label className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                        <Dumbbell size={14} /> Activity Level
                    </label>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowActivityDropdown(!showActivityDropdown)}
                            className={`w-full p-3 rounded-lg text-left transition-all flex items-center justify-between ${showActivityDropdown
                                    ? 'bg-zinc-800 border border-orange-500'
                                    : 'bg-zinc-900/50 border border-zinc-700 hover:border-zinc-600'
                                }`}
                        >
                            <div>
                                <span className="text-white font-medium">{ACTIVITY_LABELS[activityLevel].title}</span>
                                <span className="text-xs text-zinc-500 ml-2">{ACTIVITY_LABELS[activityLevel].description}</span>
                            </div>
                            <ChevronDown
                                size={16}
                                className={`text-zinc-500 transition-transform ${showActivityDropdown ? 'rotate-180 text-orange-500' : ''}`}
                            />
                        </button>

                        <AnimatePresence>
                            {showActivityDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                    className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
                                >
                                    {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => {
                                                setActivityLevel(level);
                                                setShowActivityDropdown(false);
                                            }}
                                            className={`w-full p-3 text-left transition-colors flex items-center justify-between ${activityLevel === level
                                                    ? 'bg-orange-600/10 text-orange-400'
                                                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                                                }`}
                                        >
                                            <div>
                                                <span className={`font-medium block ${activityLevel === level ? 'text-orange-400' : 'text-white'}`}>
                                                    {ACTIVITY_LABELS[level].title}
                                                </span>
                                                <span className="text-xs text-zinc-500">{ACTIVITY_LABELS[level].description}</span>
                                            </div>
                                            {activityLevel === level && <Check size={16} className="text-orange-500" />}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Calculate Button */}
                <button
                    onClick={handleCalculate}
                    disabled={!results}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${results
                            ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:brightness-110 active:scale-[0.98]'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                >
                    <Flame size={20} />
                    Calculate TDEE
                </button>
            </div>

            {/* Results */}
            <AnimatePresence>
                {showResults && results && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="space-y-4"
                    >
                        {/* Goal Selector */}
                        <div className="glass-card p-4 rounded-xl">
                            <h3 className="text-xs text-zinc-500 font-medium mb-3">YOUR GOAL</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {(Object.keys(GOAL_INFO) as Goal[]).map((g) => (
                                    <button
                                        key={g}
                                        onClick={() => setGoal(g)}
                                        className={`p-3 rounded-lg transition-all flex flex-col items-center gap-1 ${goal === g
                                                ? `bg-${GOAL_INFO[g].color}-500/20 border border-${GOAL_INFO[g].color}-500/50 text-${GOAL_INFO[g].color}-400`
                                                : 'bg-zinc-800/50 border border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                            }`}
                                        style={goal === g ? {
                                            backgroundColor: g === 'cutting' ? 'rgba(16, 185, 129, 0.2)' :
                                                g === 'maintenance' ? 'rgba(59, 130, 246, 0.2)' :
                                                    'rgba(245, 158, 11, 0.2)',
                                            borderColor: g === 'cutting' ? 'rgba(16, 185, 129, 0.5)' :
                                                g === 'maintenance' ? 'rgba(59, 130, 246, 0.5)' :
                                                    'rgba(245, 158, 11, 0.5)',
                                            color: g === 'cutting' ? '#34d399' :
                                                g === 'maintenance' ? '#60a5fa' :
                                                    '#fbbf24'
                                        } : {}}
                                    >
                                        {GOAL_INFO[g].icon}
                                        <span className="text-sm font-medium">{GOAL_INFO[g].label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Main Stats */}
                        <div className="glass-card p-5 rounded-xl border-l-2 border-l-orange-500">
                            <h3 className="text-xs text-zinc-500 font-medium mb-4">YOUR DAILY ENERGY EXPENDITURE</h3>

                            <div className="flex items-end gap-2 mb-4">
                                <span className="text-5xl font-black text-white">{goalCalories.toLocaleString()}</span>
                                <span className="text-zinc-400 pb-2">calories/day</span>
                            </div>

                            <div className="flex gap-4 mb-4">
                                <div className="flex-1 bg-zinc-800/50 p-3 rounded-lg">
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">BMR</p>
                                    <p className="text-lg font-bold text-white">{results.bmr.toLocaleString()}</p>
                                    <p className="text-[10px] text-zinc-600">calories at rest</p>
                                </div>
                                <div className="flex-1 bg-zinc-800/50 p-3 rounded-lg">
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">TDEE</p>
                                    <p className="text-lg font-bold text-orange-400">{results.tdee.toLocaleString()}</p>
                                    <p className="text-[10px] text-zinc-600">with activity</p>
                                </div>
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${saveSuccess
                                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/50'
                                        : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                                    }`}
                            >
                                {saveSuccess ? (
                                    <>
                                        <Check size={18} />
                                        Saved Successfully!
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        {isSaving ? 'Saving...' : 'Save to Profile'}
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Body Composition */}
                        {bodyComposition && (
                            <div className="glass-card p-5 rounded-xl">
                                <h3 className="text-xs text-zinc-500 font-medium mb-4 flex items-center gap-2">
                                    <Dumbbell size={14} /> BODY COMPOSITION & PROTEIN
                                </h3>

                                {bodyComposition.leanMass && bodyComposition.fatMass && (
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg text-center">
                                            <p className="text-[10px] text-blue-400 uppercase">Lean Mass</p>
                                            <p className="text-xl font-bold text-blue-400">{bodyComposition.leanMass.toFixed(1)} kg</p>
                                        </div>
                                        <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-center">
                                            <p className="text-[10px] text-amber-400 uppercase">Fat Mass</p>
                                            <p className="text-xl font-bold text-amber-400">{bodyComposition.fatMass.toFixed(1)} kg</p>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Utensils size={16} className="text-red-400" />
                                        <span className="text-sm font-medium text-red-400">Protein Target</span>
                                    </div>
                                    <p className="text-2xl font-bold text-white">
                                        {bodyComposition.proteinMin} - {bodyComposition.proteinMax}g
                                    </p>
                                    <p className="text-[10px] text-zinc-500 mt-1">
                                        {bodyComposition.leanMass
                                            ? '1.6-2.2g per kg lean body mass (optimal for muscle growth)'
                                            : '1.6-2.2g per kg bodyweight (estimate)'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Calorie Targets */}
                        <div className="glass-card p-5 rounded-xl">
                            <h3 className="text-xs text-zinc-500 font-medium mb-4 flex items-center gap-2">
                                <Target size={14} /> CALORIE TARGETS
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                <div className={`text-center p-3 rounded-lg transition-all ${goal === 'cutting'
                                        ? 'bg-emerald-500/20 border-2 border-emerald-500'
                                        : 'bg-emerald-500/10 border border-emerald-500/30'
                                    }`}>
                                    <p className="text-[10px] text-emerald-400 uppercase mb-1">Cutting</p>
                                    <p className="text-xl font-bold text-emerald-400">{results.cutting.toLocaleString()}</p>
                                    <p className="text-[10px] text-zinc-600">-500 cal</p>
                                </div>
                                <div className={`text-center p-3 rounded-lg transition-all ${goal === 'maintenance'
                                        ? 'bg-blue-500/20 border-2 border-blue-500'
                                        : 'bg-blue-500/10 border border-blue-500/30'
                                    }`}>
                                    <p className="text-[10px] text-blue-400 uppercase mb-1">Maintain</p>
                                    <p className="text-xl font-bold text-blue-400">{results.maintenance.toLocaleString()}</p>
                                    <p className="text-[10px] text-zinc-600">baseline</p>
                                </div>
                                <div className={`text-center p-3 rounded-lg transition-all ${goal === 'bulking'
                                        ? 'bg-amber-500/20 border-2 border-amber-500'
                                        : 'bg-amber-500/10 border border-amber-500/30'
                                    }`}>
                                    <p className="text-[10px] text-amber-400 uppercase mb-1">Bulking</p>
                                    <p className="text-xl font-bold text-amber-400">{results.bulking.toLocaleString()}</p>
                                    <p className="text-[10px] text-zinc-600">+500 cal</p>
                                </div>
                            </div>
                        </div>

                        {/* Macros */}
                        <div className="glass-card p-5 rounded-xl">
                            <h3 className="text-xs text-zinc-500 font-medium mb-4 flex items-center gap-2">
                                <Utensils size={14} /> MACRO BREAKDOWN
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center">
                                        <span className="text-lg font-bold text-red-400">{results.macros.protein}g</span>
                                    </div>
                                    <p className="text-xs text-zinc-400">Protein</p>
                                    <p className="text-[10px] text-zinc-600">30%</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center">
                                        <span className="text-lg font-bold text-yellow-400">{results.macros.carbs}g</span>
                                    </div>
                                    <p className="text-xs text-zinc-400">Carbs</p>
                                    <p className="text-[10px] text-zinc-600">40%</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-purple-500/20 border-2 border-purple-500/50 flex items-center justify-center">
                                        <span className="text-lg font-bold text-purple-400">{results.macros.fat}g</span>
                                    </div>
                                    <p className="text-xs text-zinc-400">Fat</p>
                                    <p className="text-[10px] text-zinc-600">30%</p>
                                </div>
                            </div>
                        </div>

                        {/* Training Day Tips */}
                        <div className="glass-card p-5 rounded-xl">
                            <h3 className="text-xs text-zinc-500 font-medium mb-4 flex items-center gap-2">
                                <Zap size={14} /> TRAINING DAY VS REST DAY
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Dumbbell size={16} className="text-orange-400" />
                                        <span className="text-sm font-medium text-orange-400">Training Day</span>
                                    </div>
                                    <p className="text-xl font-bold text-white">{(goalCalories + 200).toLocaleString()}</p>
                                    <p className="text-[10px] text-zinc-500">+200 cal for recovery</p>
                                </div>
                                <div className="bg-zinc-800/50 border border-zinc-700 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Activity size={16} className="text-zinc-400" />
                                        <span className="text-sm font-medium text-zinc-400">Rest Day</span>
                                    </div>
                                    <p className="text-xl font-bold text-white">{(goalCalories - 100).toLocaleString()}</p>
                                    <p className="text-[10px] text-zinc-500">-100 cal lower activity</p>
                                </div>
                            </div>
                        </div>

                        {/* Personalized Tips */}
                        <div className="glass-card p-5 rounded-xl">
                            <h3 className="text-xs text-zinc-500 font-medium mb-4 flex items-center gap-2">
                                <Info size={14} /> PERSONALIZED TIPS
                            </h3>
                            <div className="space-y-3">
                                {goal === 'cutting' && (
                                    <>
                                        <div className="flex gap-3 items-start">
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check size={12} className="text-emerald-400" />
                                            </div>
                                            <p className="text-sm text-zinc-300">Aim for 0.5-1% body weight loss per week to preserve muscle</p>
                                        </div>
                                        <div className="flex gap-3 items-start">
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check size={12} className="text-emerald-400" />
                                            </div>
                                            <p className="text-sm text-zinc-300">Keep protein high ({bodyComposition?.proteinMin}g+) to maintain muscle mass</p>
                                        </div>
                                        <div className="flex gap-3 items-start">
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check size={12} className="text-emerald-400" />
                                            </div>
                                            <p className="text-sm text-zinc-300">Prioritize compound lifts and reduce volume slightly</p>
                                        </div>
                                    </>
                                )}
                                {goal === 'maintenance' && (
                                    <>
                                        <div className="flex gap-3 items-start">
                                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check size={12} className="text-blue-400" />
                                            </div>
                                            <p className="text-sm text-zinc-300">Focus on progressive overload to build strength</p>
                                        </div>
                                        <div className="flex gap-3 items-start">
                                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check size={12} className="text-blue-400" />
                                            </div>
                                            <p className="text-sm text-zinc-300">Body recomposition is possible - lose fat while gaining muscle</p>
                                        </div>
                                        <div className="flex gap-3 items-start">
                                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check size={12} className="text-blue-400" />
                                            </div>
                                            <p className="text-sm text-zinc-300">Track progress with measurements, not just the scale</p>
                                        </div>
                                    </>
                                )}
                                {goal === 'bulking' && (
                                    <>
                                        <div className="flex gap-3 items-start">
                                            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check size={12} className="text-amber-400" />
                                            </div>
                                            <p className="text-sm text-zinc-300">Aim for 0.25-0.5% body weight gain per week</p>
                                        </div>
                                        <div className="flex gap-3 items-start">
                                            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check size={12} className="text-amber-400" />
                                            </div>
                                            <p className="text-sm text-zinc-300">Focus on progressive overload and higher training volume</p>
                                        </div>
                                        <div className="flex gap-3 items-start">
                                            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check size={12} className="text-amber-400" />
                                            </div>
                                            <p className="text-sm text-zinc-300">Prioritize sleep and recovery for optimal muscle growth</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* TDEE by Activity Level */}
                        <div className="glass-card p-5 rounded-xl">
                            <h3 className="text-xs text-zinc-500 font-medium mb-4">TDEE BY ACTIVITY LEVEL</h3>
                            <div className="space-y-2">
                                {[
                                    { label: 'Sedentary', value: results.sedentary, level: 'sedentary' as ActivityLevel },
                                    { label: 'Lightly Active', value: results.lightlyActive, level: 'light' as ActivityLevel },
                                    { label: 'Moderately Active', value: results.moderatelyActive, level: 'moderate' as ActivityLevel },
                                    { label: 'Very Active', value: results.veryActive, level: 'active' as ActivityLevel },
                                    { label: 'Extra Active', value: results.extraActive, level: 'veryActive' as ActivityLevel },
                                ].map((item) => (
                                    <div
                                        key={item.level}
                                        className={`flex justify-between items-center p-3 rounded-lg transition-colors ${activityLevel === item.level
                                                ? 'bg-orange-600/20 border border-orange-600/30'
                                                : 'bg-zinc-800/30'
                                            }`}
                                    >
                                        <span className={`text-sm ${activityLevel === item.level ? 'text-orange-400 font-medium' : 'text-zinc-400'}`}>
                                            {item.label}
                                        </span>
                                        <span className={`font-bold ${activityLevel === item.level ? 'text-orange-400' : 'text-white'}`}>
                                            {item.value.toLocaleString()} cal
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800">
                            <h4 className="text-xs font-bold text-zinc-400 mb-2">How TDEE Is Calculated</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                Your Total Daily Energy Expenditure (TDEE) is calculated using the Mifflin-St Jeor formula
                                for BMR, then multiplied by your activity level. This represents the total calories your
                                body burns in a day, including all physical activity.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
