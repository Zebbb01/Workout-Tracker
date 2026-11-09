'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useActions, useData, useProfile } from '@/lib/data';
import { cmToFeetInches, computeTargets, feetInchesToCm, fromKg, toKg, unitLabel } from '@/lib/calc';
import type { Activity, Goal, Sex, Targets, Units } from '@/lib/types';
import { Button, Field, NumberInput, ScreenSkeleton, Segmented } from '@/components/ui';
import { Select } from '@/components/select';

const GOALS: { value: Goal; label: string; detail: string }[] = [
  { value: 'lose', label: 'Lose fat', detail: 'About 0.5 kg (1 lb) a week' },
  { value: 'maintain', label: 'Stay where I am', detail: 'Eat to maintain your weight' },
  { value: 'gain', label: 'Build muscle', detail: 'A small surplus for steady gains' },
];

const ACTIVITY: { value: Activity; label: string }[] = [
  { value: 'sedentary', label: 'Mostly sitting, little exercise' },
  { value: 'light', label: 'Exercise 1–3 days a week' },
  { value: 'moderate', label: 'Exercise 3–5 days a week' },
  { value: 'active', label: 'Hard exercise 6–7 days a week' },
  { value: 'very_active', label: 'Physical job and daily training' },
];

// Used when a step is skipped.
const DEFAULTS = { goal: 'maintain' as Goal, sex: null as Sex | null, age: '30', heightCm: '170', weightKg: '70', activity: 'moderate' as Activity };

export default function OnboardingPage() {
  const router = useRouter();
  const { ready, user } = useData();
  const profile = useProfile();
  const actions = useActions();

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(DEFAULTS.goal);
  const [units, setUnits] = useState<Units>('metric');
  const [sex, setSex] = useState<Sex | null>(DEFAULTS.sex);
  const [age, setAge] = useState(DEFAULTS.age);
  const [height, setHeight] = useState(DEFAULTS.heightCm); // cm, or feet when imperial
  const [inches, setInches] = useState('7');
  const [weight, setWeight] = useState(DEFAULTS.weightKg); // in the chosen units
  const [weightTyped, setWeightTyped] = useState(false);
  const [activity, setActivity] = useState(DEFAULTS.activity);
  const [targets, setTargets] = useState<Record<keyof Targets, string> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace('/welcome');
    else if (profile?.onboarded_at) router.replace('/');
  }, [ready, user, profile, router]);

  const num = (v: string, fallback: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);
  const heightCm = units === 'metric' ? num(height, 170) : feetInchesToCm(num(height, 5), Number(inches) || 0);
  const weightKg = toKg(num(weight, units === 'metric' ? 70 : 154), units);
  const computed = useMemo(
    () => computeTargets({ sex, age: Math.min(110, Math.max(13, num(age, 30))), heightCm, weightKg, activity, goal }),
    [sex, age, heightCm, weightKg, activity, goal],
  );

  function switchUnits(next: Units) {
    if (next === units) return;
    if (next === 'imperial') {
      const { feet, inches: i } = cmToFeetInches(heightCm);
      setHeight(String(feet));
      setInches(String(i));
    } else setHeight(String(Math.round(heightCm)));
    setWeight(String(Math.round(fromKg(weightKg, next))));
    setUnits(next);
  }

  async function finish(skipped: boolean) {
    setSaving(true);
    const chosen = targets
      ? { calories: num(targets.calories, computed.calories), protein_g: num(targets.protein_g, computed.protein_g), carbs_g: num(targets.carbs_g, computed.carbs_g), fat_g: num(targets.fat_g, computed.fat_g) }
      : computed;
    await actions.saveProfile({
      units, goal, sex, activity,
      age: Math.round(Math.min(110, Math.max(13, num(age, 30)))),
      height_cm: Math.round(Math.min(250, Math.max(100, heightCm)) * 10) / 10,
      calories: Math.round(Math.min(8000, Math.max(800, chosen.calories))),
      protein_g: Math.round(chosen.protein_g), carbs_g: Math.round(chosen.carbs_g), fat_g: Math.round(chosen.fat_g),
      onboarded_at: new Date().toISOString(),
    });
    // Only a weight the person typed counts as today's weigh-in.
    if (weightTyped && !skipped && weightKg >= 20 && weightKg <= 400) await actions.saveWeight(weightKg);
    router.replace('/');
  }

  if (!ready || !user || profile === undefined) return <main className="mx-auto max-w-md px-4 py-5"><ScreenSkeleton /></main>;

  const next = () => {
    if (step === 1) setTargets({ calories: String(computed.calories), protein_g: String(computed.protein_g), carbs_g: String(computed.carbs_g), fat_g: String(computed.fat_g) });
    setStep(step + 1);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-5">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
        <span className="tabular text-xs text-muted-foreground">Step {step + 1} of 3</span>
        <Button variant="ghost" size="sm" onClick={() => finish(true)} disabled={saving}>
          Skip setup
        </Button>
      </div>

      <div key={step} className="mt-8 flex-1 animate-rise-in space-y-5">
        {step === 0 && (
          <>
            <h1 className="font-display text-3xl font-bold">What&apos;s your goal?</h1>
            <div className="space-y-2" role="radiogroup" aria-label="Goal">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  role="radio"
                  aria-checked={goal === g.value}
                  onClick={() => setGoal(g.value)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition ${goal === g.value ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'}`}
                >
                  <span className="flex-1">
                    <span className="block font-semibold">{g.label}</span>
                    <span className="block text-sm text-muted-foreground">{g.detail}</span>
                  </span>
                  <span className={`size-5 shrink-0 rounded-full border-2 ${goal === g.value ? 'border-[6px] border-primary' : 'border-input'}`} aria-hidden />
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <h1 className="font-display text-3xl font-bold">About you</h1>
              <p className="text-sm text-muted-foreground">For your daily calories only.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Segmented label="Units" fit value={units} onChange={switchUnits} options={[{ value: 'metric', label: 'kg, cm' }, { value: 'imperial', label: 'lb, ft' }]} />
              <Segmented
                label="Sex"
                fit
                value={sex ?? 'unset'}
                onChange={(v) => setSex(v === 'unset' ? null : (v as Sex))}
                options={[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }, { value: 'unset', label: 'Skip' }]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age">
                <NumberInput value={age} onChange={setAge} inputMode="numeric" />
              </Field>
              <Field label={`Weight (${unitLabel(units)})`}>
                <NumberInput value={weight} onChange={(v) => { setWeight(v); setWeightTyped(true); }} />
              </Field>
            </div>
            {units === 'metric' ? (
              <Field label="Height (cm)">
                <NumberInput value={height} onChange={setHeight} inputMode="numeric" />
              </Field>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Height (ft)">
                  <NumberInput value={height} onChange={setHeight} inputMode="numeric" />
                </Field>
                <Field label="(in)">
                  <NumberInput value={inches} onChange={setInches} inputMode="numeric" />
                </Field>
              </div>
            )}
            <Select label="How active are you?" value={activity} onChange={setActivity} options={ACTIVITY.map((a) => ({ value: a.value, label: a.label }))} />
          </>
        )}

        {step === 2 && targets && (
          <>
            <div>
              <h1 className="font-display text-3xl font-bold">Your daily targets</h1>
              <p className="text-sm text-muted-foreground">A starting point. Change them any time in More.</p>
            </div>
            <Field label="Calories (kcal)">
              <NumberInput value={targets.calories} onChange={(v) => setTargets({ ...targets, calories: v })} inputMode="numeric" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Protein (g)">
                <NumberInput value={targets.protein_g} onChange={(v) => setTargets({ ...targets, protein_g: v })} inputMode="numeric" />
              </Field>
              <Field label="Carbs (g)">
                <NumberInput value={targets.carbs_g} onChange={(v) => setTargets({ ...targets, carbs_g: v })} inputMode="numeric" />
              </Field>
              <Field label="Fat (g)">
                <NumberInput value={targets.fat_g} onChange={(v) => setTargets({ ...targets, fat_g: v })} inputMode="numeric" />
              </Field>
            </div>
          </>
        )}
      </div>

      <div className="mt-8 flex gap-2 pb-safe">
        {step > 0 && (
          <Button size="lg" variant="secondary" onClick={() => setStep(step - 1)} disabled={saving}>
            Back
          </Button>
        )}
        {step < 2 ? (
          <Button size="lg" block onClick={next}>
            Next
          </Button>
        ) : (
          <Button size="lg" block onClick={() => finish(false)} busy={saving}>
            Start tracking
          </Button>
        )}
      </div>
    </main>
  );
}
