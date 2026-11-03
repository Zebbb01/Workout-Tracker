'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Repeat, Search, Trash2 } from 'lucide-react';
import { useActions, useCustomExercises, useProfile, useSets } from '@/lib/data';
import { byExercise, formatWeight, fromKg, lastSetOf, lastWorkout, localDay, recentExercises, toKg, unitLabel } from '@/lib/calc';
import { CATEGORIES, EXERCISES } from '@/lib/exercises';
import type { Units, WorkoutSet } from '@/lib/types';
import { Button, Card, Empty, Field, IconButton, Loading, PageHeader, Sheet, Stepper, cx, inputClass, useToast } from '@/components/ui';
import { SyncBadge } from '@/components/Shell';

const STARTERS = ['bench-press', 'squat', 'deadlift', 'overhead-press', 'pull-up', 'barbell-row'];
const roundTo = (value: number, step: number) => Math.round(value / step) * step;
const dayName = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });

function LogScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const profile = useProfile();
  const sets = useSets();
  const custom = useCustomExercises();
  const actions = useActions();
  const toast = useToast();

  // What the person has picked or changed; until then, the last exercise they did.
  const [draft, setDraft] = useState<{ id: string; weight: number; reps: number } | null>(null);
  const [picking, setPicking] = useState(false);
  const [repeating, setRepeating] = useState(params.get('repeat') === '1');
  const [saving, setSaving] = useState(false);

  const units: Units = profile?.units ?? 'metric';
  const allExercises = useMemo(() => [...EXERCISES, ...(custom ?? []).map((e) => ({ id: e.id, name: e.name, category: e.category }))], [custom]);
  const nameOf = (id: string) => allExercises.find((e) => e.id === id)?.name ?? sets?.find((s) => s.exercise_id === id)?.exercise_name ?? id;

  const recent = useMemo(() => (sets ? recentExercises(sets) : []), [sets]);
  const chips = recent.length ? recent : STARTERS.map((id) => ({ id, name: nameOf(id) }));

  if (!profile || !sets || !custom) return <Loading />;

  /** The next set of an exercise starts as a copy of its last one; a new exercise starts with an empty bar. */
  const startFor = (id: string) => {
    const previous = lastSetOf(sets, id);
    return {
      id,
      weight: previous ? roundTo(fromKg(previous.weight_kg, units), units === 'metric' ? 0.5 : 1) : units === 'metric' ? 20 : 45,
      reps: previous ? previous.reps : 8,
    };
  };
  const current = draft ?? (recent[0] ? startFor(recent[0].id) : null);
  const exerciseId = current?.id ?? null;
  const choose = (id: string) => setDraft(startFor(id));

  const today = localDay(new Date());
  const todaysSets = sets.filter((s) => localDay(s.performed_at) === today);
  const last = lastWorkout(sets, today);

  async function addSet() {
    if (!current || current.reps < 1) return;
    setSaving(true);
    const kg = toKg(current.weight, units);
    await actions.addSets([{ exercise_id: current.id, exercise_name: nameOf(current.id), weight_kg: kg, reps: current.reps }]);
    setDraft(current);
    setSaving(false);
    toast({ message: `Set saved: ${nameOf(current.id)}, ${formatWeight(kg, units)} × ${current.reps}` });
  }

  async function repeat() {
    if (!last) return;
    // Same order as last time; addSets stamps them now.
    await actions.addSets(last.sets.map((s) => ({ exercise_id: s.exercise_id, exercise_name: s.exercise_name, weight_kg: s.weight_kg, reps: s.reps })));
    setRepeating(false);
    router.replace('/log');
    toast({ message: `${last.sets.length} ${last.sets.length === 1 ? 'set' : 'sets'} logged from ${dayName(last.day)}` });
  }

  async function remove(set: WorkoutSet) {
    await actions.remove('sets', set.id);
    toast({ message: `Set removed`, undo: () => actions.restore('sets', set.id) });
  }

  return (
    <>
      <PageHeader title="Log" subtitle="Add sets as you go" action={<SyncBadge />} />

      {last && !todaysSets.length && (
        <Button variant="secondary" size="lg" block className="mb-4" onClick={() => setRepeating(true)}>
          <Repeat size={18} aria-hidden /> Repeat {dayName(last.day)}
        </Button>
      )}

      <Card aria-labelledby="add-set-title">
        <h2 id="add-set-title" className="mb-2 font-semibold">Add a set</h2>
        <div className="-mx-1 flex flex-wrap gap-2" role="radiogroup" aria-label="Exercise">
          {chips.map((e) => (
            <button
              key={e.id}
              type="button"
              role="radio"
              aria-checked={exerciseId === e.id}
              onClick={() => choose(e.id)}
              className={cx(
                'min-h-11 rounded-full border px-4 text-sm font-medium',
                exerciseId === e.id ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card hover:bg-muted',
              )}
            >
              {e.name}
            </button>
          ))}
          <button type="button" onClick={() => setPicking(true)} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-dashed border-input px-4 text-sm font-medium hover:bg-muted">
            <Search size={16} aria-hidden /> Other exercise
          </button>
        </div>

        {current ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Stepper label="Weight" unit={unitLabel(units)} value={current.weight} onChange={(weight) => setDraft({ ...current, weight })} step={units === 'metric' ? 2.5 : 5} max={units === 'metric' ? 999 : 2200} />
              <Stepper label="Reps" value={current.reps} onChange={(v) => setDraft({ ...current, reps: Math.round(v) })} step={1} min={1} max={999} />
            </div>
            <Button size="lg" block onClick={addSet} busy={saving}>
              <Plus size={20} aria-hidden /> Add set
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Pick an exercise to start.</p>
        )}
      </Card>

      <section aria-labelledby="today-sets" className="mt-6">
        <h2 id="today-sets" className="mb-2 font-semibold">Today</h2>
        {todaysSets.length === 0 ? (
          <Empty title="No sets yet today">Your sets show up here as you add them.</Empty>
        ) : (
          <div className="space-y-3">
            {byExercise(todaysSets).map((group) => (
              <Card key={group.exercise_id} className="p-0">
                <h3 className="px-4 pt-3 font-semibold">{group.exercise_name}</h3>
                <ol className="divide-y divide-border">
                  {group.sets.map((s, i) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 py-1 pl-4 pr-1">
                      <span className="tabular">
                        <span className="mr-3 text-sm text-muted-foreground">{i + 1}</span>
                        {formatWeight(s.weight_kg, units)} × {s.reps}
                      </span>
                      <IconButton label={`Remove set ${i + 1} of ${group.exercise_name}`} onClick={() => remove(s)}>
                        <Trash2 size={18} />
                      </IconButton>
                    </li>
                  ))}
                </ol>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Sheet open={repeating && Boolean(last)} onClose={() => { setRepeating(false); router.replace('/log'); }} title="Repeat last workout">
        {last && (
          <>
            <p className="text-muted-foreground">Logs the same sets as {dayName(last.day)}, for today. You can remove any afterwards.</p>
            <ul className="my-4 space-y-1">
              {byExercise(last.sets).map((g) => (
                <li key={g.exercise_id} className="flex justify-between gap-3">
                  <span>{g.exercise_name}</span>
                  <span className="tabular text-muted-foreground">
                    {g.sets.map((s) => `${Math.round(fromKg(s.weight_kg, units) * 10) / 10}×${s.reps}`).join(', ')}
                  </span>
                </li>
              ))}
            </ul>
            <Button size="lg" block onClick={repeat}>
              Log {last.sets.length} {last.sets.length === 1 ? 'set' : 'sets'}
            </Button>
          </>
        )}
      </Sheet>

      <ExercisePicker open={picking} onClose={() => setPicking(false)} exercises={allExercises} onPick={(id) => { choose(id); setPicking(false); }} />
    </>
  );
}

function ExercisePicker({ open, onClose, exercises, onPick }: {
  open: boolean; onClose: () => void; exercises: { id: string; name: string; category: string }[]; onPick: (id: string) => void;
}) {
  const actions = useActions();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Other');
  const matches = exercises.filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()));
  const exact = exercises.some((e) => e.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <Sheet open={open} onClose={onClose} title="Choose an exercise">
      <Field label="Search">
        <input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. squat" autoComplete="off" />
      </Field>
      <ul className="mt-3 divide-y divide-border">
        {matches.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => onPick(e.id)} className="flex min-h-12 w-full items-center justify-between gap-3 px-1 text-left hover:bg-muted">
              <span>{e.name}</span>
              <span className="text-sm text-muted-foreground">{e.category}</span>
            </button>
          </li>
        ))}
      </ul>
      {query.trim() && !exact && (
        <form
          className="mt-4 space-y-3 rounded-2xl bg-muted p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const row = await actions.addExercise(query, category);
            setQuery('');
            onPick(row.id);
          }}
        >
          <p className="text-sm">
            Add <strong>{query.trim()}</strong> as a new exercise
          </p>
          <Field label="Body part">
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Button type="submit" block>
            Add exercise
          </Button>
        </form>
      )}
      {!matches.length && !query.trim() && <Empty title="No exercises" />}
    </Sheet>
  );
}

export default function LogPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LogScreen />
    </Suspense>
  );
}
