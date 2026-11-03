'use client';

import { useRef, useState } from 'react';
import { Camera, Keyboard, Loader2, MessageSquareText, Sparkles } from 'lucide-react';
import { useActions } from '@/lib/data';
import { mealTypeAt } from '@/lib/calc';
import type { MealSource, MealType } from '@/lib/types';
import { Button, Field, NumberInput, Segmented, Sheet, inputClass, useToast } from './ui';

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

type Form = { name: string; meal_type: MealType; calories: string; protein_g: string; carbs_g: string; fat_g: string };

/** Phone photos are several megabytes; 1024 px is plenty to recognise a meal and keeps the upload small. */
async function shrinkPhoto(file: File, maxSide = 1024): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('unreadable'))), 'image/jpeg', 0.8));
}

/**
 * Adding a meal: photograph it, describe it, or type the numbers. An AI
 * estimate only fills the form; the person checks it and taps Save.
 */
export function MealSheet({ open, onClose, day }: { open: boolean; onClose: () => void; day: string }) {
  const actions = useActions();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<'choose' | 'describe' | 'review'>('choose');
  const [source, setSource] = useState<MealSource>('manual');
  const [form, setForm] = useState<Form>(() => blank());
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function blank(): Form {
    return { name: '', meal_type: mealTypeAt(new Date()), calories: '', protein_g: '', carbs_g: '', fat_g: '' };
  }

  function reset() {
    setStage('choose');
    setSource('manual');
    setForm(blank());
    setDescription('');
    if (photo) URL.revokeObjectURL(photo);
    setPhoto(null);
    setProblem(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function estimate(body: BodyInit, kind: MealSource) {
    setEstimating(true);
    setProblem(null);
    setStage('review');
    try {
      const response = await fetch('/api/nutrition', kind === 'photo' ? { method: 'POST', body } : { method: 'POST', body, headers: { 'content-type': 'application/json' } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'The estimate did not work. Enter the numbers yourself.');
      setForm((f) => ({ ...f, name: data.name, calories: String(data.calories), protein_g: String(data.protein_g), carbs_g: String(data.carbs_g), fat_g: String(data.fat_g) }));
      setSource(kind);
    } catch (error) {
      setProblem(navigator.onLine ? (error as Error).message : "You're offline, so there's no estimate. Enter the numbers yourself.");
      setSource('manual');
    } finally {
      setEstimating(false);
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      const small = await shrinkPhoto(file);
      setPhoto(URL.createObjectURL(small));
      const body = new FormData();
      body.append('image', small, 'meal.jpg');
      await estimate(body, 'photo');
    } catch {
      setStage('review');
      setProblem("Couldn't read that photo. Try another, or enter the numbers yourself.");
    }
  }

  const n = (v: string) => (v.trim() === '' ? 0 : Number(v));
  const invalid =
    !form.name.trim() ? 'Give the meal a name.'
      : [form.calories, form.protein_g, form.carbs_g, form.fat_g].some((v) => !Number.isFinite(n(v)) || n(v) < 0) ? 'Numbers must be zero or more.'
        : n(form.calories) > 10000 || n(form.protein_g) > 1000 || n(form.carbs_g) > 1500 || n(form.fat_g) > 500 ? 'That looks too large for one meal.'
          : null;

  async function save() {
    if (invalid) return;
    setSaving(true);
    const now = new Date();
    const [y, m, d] = day.split('-').map(Number);
    const eaten = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
    await actions.addMeal({
      name: form.name.trim(),
      meal_type: form.meal_type,
      calories: Math.round(n(form.calories)),
      protein_g: Math.round(n(form.protein_g) * 10) / 10,
      carbs_g: Math.round(n(form.carbs_g) * 10) / 10,
      fat_g: Math.round(n(form.fat_g) * 10) / 10,
      source,
      eaten_at: eaten.toISOString(),
    });
    setSaving(false);
    toast({ message: `${form.name.trim()} saved` });
    close();
  }

  const set = (key: keyof Form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const OPTIONS = [
    { icon: Camera, title: 'Take a photo', hint: 'AI fills in the numbers', onClick: () => fileInput.current?.click() },
    { icon: MessageSquareText, title: 'Describe it', hint: 'e.g. “2 eggs and toast”', onClick: () => setStage('describe') },
    { icon: Keyboard, title: 'Enter numbers', hint: 'Type them yourself', onClick: () => setStage('review') },
  ];

  return (
    <Sheet open={open} onClose={close} title="Add a meal">
      <input ref={fileInput} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => onPhoto(e.target.files?.[0])} />

      {stage === 'choose' && (
        <>
          <ul className="grid gap-2">
            {OPTIONS.map(({ icon: Icon, title, hint, onClick }) => (
              <li key={title}>
                <button
                  type="button"
                  onClick={onClick}
                  className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition hover:bg-muted/60 active:scale-[0.99]"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-accent">
                    <Icon size={20} aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="block text-sm text-muted-foreground">{hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Photos and descriptions go to Google Gemini for the estimate and aren&apos;t stored. Free-tier inputs may help Google improve its models, so photograph only food.
          </p>
        </>
      )}

      {stage === 'describe' && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (description.trim()) estimate(JSON.stringify({ text: description.trim() }), 'text');
          }}
        >
          <Field label="What did you eat?">
            <textarea className={`${inputClass} h-auto min-h-24 py-2`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} placeholder="2 eggs, 2 slices of toast with butter" autoFocus />
          </Field>
          <Button type="submit" size="lg" block disabled={!description.trim()}>
            <Sparkles size={18} aria-hidden /> Estimate
          </Button>
        </form>
      )}

      {stage === 'review' && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {(photo || estimating || source !== 'manual') && (
            <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-2">
              {photo && <img src={photo} alt="Your meal photo" className="size-14 shrink-0 rounded-lg object-cover" />}
              {estimating ? (
                <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" aria-hidden /> Estimating…
                </p>
              ) : (
                source !== 'manual' && (
                  <p className="flex items-start gap-1.5 text-sm">
                    <Sparkles size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                    AI estimate. Check the numbers, then save.
                  </p>
                )
              )}
            </div>
          )}
          {problem && (
            <p role="alert" className="rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">
              {problem}
            </p>
          )}
          <fieldset disabled={estimating} className={estimating ? 'space-y-4 animate-pulse' : 'space-y-4'}>
            <Field label="Meal name">
              <input className={inputClass} value={form.name} onChange={(e) => set('name')(e.target.value)} maxLength={120} autoComplete="off" />
            </Field>
            <Segmented label="Meal" value={form.meal_type} onChange={(v) => setForm((f) => ({ ...f, meal_type: v }))} options={MEAL_TYPES} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Calories (kcal)">
                <NumberInput value={form.calories} onChange={set('calories')} inputMode="numeric" />
              </Field>
              <Field label="Protein (g)">
                <NumberInput value={form.protein_g} onChange={set('protein_g')} />
              </Field>
              <Field label="Carbs (g)">
                <NumberInput value={form.carbs_g} onChange={set('carbs_g')} />
              </Field>
              <Field label="Fat (g)">
                <NumberInput value={form.fat_g} onChange={set('fat_g')} />
              </Field>
            </div>
          </fieldset>
          {form.name && invalid && <p className="text-sm text-negative">{invalid}</p>}
          <div className="flex gap-2">
            <Button variant="secondary" size="lg" onClick={reset} disabled={saving}>
              Back
            </Button>
            <Button type="submit" size="lg" block busy={saving} disabled={estimating || Boolean(invalid)}>
              Save meal
            </Button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
