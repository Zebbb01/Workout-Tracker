'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Repeat, Search, Trash2 } from 'lucide-react';
import { useActions, useCustomExercises, useProfile, useSets } from '@/lib/data';
import { byExercise, formatWeight, fromKg, lastSetOf, lastWorkout, localDay, recentExercises, toKg, unitLabel } from '@/lib/calc';
import { CATEGORIES, EXERCISES } from '@/lib/exercises';
import type { Units, WorkoutSet } from '@/lib/types';
import { Button, Empty, IconButton, PageHeader, Panel, ScreenSkeleton, Select, Sheet, Stepper, cx, inputClass, useToast } from '@/components/ui';
import { SyncBadge } from '@/components/Shell';

const STARTERS = ['bench-press', 'squat', 'deadlift', 'overhead-press', 'pull-up', 'barbell-row'];
const roundTo = (value: number, step: number) => Math.round(value / step) * step;
const weekday = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long' });

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

  if (!profile || !sets || !custom) return <ScreenSkeleton />;

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
  const previous = current ? lastSetOf(sets, current.id) : null;
  const choose = (id: string) => setDraft(startFor(id));

  const today = localDay(new Date());
  const todaysSets = sets.filter((s) => localDay(s.performed_at) === today);
  const last = lastWorkout(sets, today);
  const shownChips = current && !chips.some((c) => c.id === current.id) ? [{ id: current.id, name: nameOf(current.id) }, ...chips] : chips;

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
    toast({ message: `${last.sets.length} ${last.sets.length === 1 ? 'set' : 'sets'} logged from ${weekday(last.day)}` });
  }

  async function remove(set: WorkoutSet) {
    await actions.remove('sets', set.id);
    toast({ message: 'Set removed', undo: () => actions.restore('sets', set.id) });
  }

  return (
    <>
      <PageHeader title="Log" action={<SyncBadge className="lg:hidden" />} />

      {last && !todaysSets.length && (
        <Panel className="mb-4 flex items-center gap-3 p-3 pl-4">
          <Repeat size={18} className="shrink-0 text-accent" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{weekday(last.day)}&apos;s workout</p>
            <p className="truncate text-sm text-muted-foreground">
              {last.sets.length} sets · {byExercise(last.sets).map((g) => g.exercise_name).join(', ')}
            </p>
          </div>
          <Button size="sm" onClick={() => setRepeating(true)}>
            Repeat {weekday(last.day)}
          </Button>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Panel aria-label="Add a set" className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="eyebrow">Exercise</h2>
            <Button variant="ghost" size="sm" onClick={() => setPicking(true)}>
              <Search size={15} aria-hidden /> All exercises
            </Button>
          </div>
          {/* One scrolling row on phones keeps the steppers within thumb reach. */}
          <div className="-mx-4 mt-1 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0" role="radiogroup" aria-label="Exercise">
            {shownChips.map((e) => (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={current?.id === e.id}
                onClick={() => choose(e.id)}
                className={cx(
                  'h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-medium transition active:scale-[0.97] lg:h-9',
                  current?.id === e.id ? 'bg-foreground text-background' : 'bg-muted text-foreground hover:bg-muted/70',
                )}
              >
                {e.name}
              </button>
            ))}
          </div>

          {current ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="font-display text-xl font-bold">{nameOf(current.id)}</p>
                <p className="tabular text-sm text-muted-foreground">
                  {previous ? `Last time: ${formatWeight(previous.weight_kg, units)} × ${previous.reps}` : 'First time logging this one'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Stepper label="Weight" unit={unitLabel(units)} value={current.weight} onChange={(weight) => setDraft({ ...current, weight })} step={units === 'metric' ? 2.5 : 5} max={units === 'metric' ? 999 : 2200} />
                <Stepper label="Reps" value={current.reps} onChange={(v) => setDraft({ ...current, reps: Math.round(v) })} step={1} min={1} max={999} />
              </div>
              <Button size="lg" block onClick={addSet} busy={saving}>
                <Plus size={18} aria-hidden /> Add set
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Pick an exercise to start.</p>
          )}
        </Panel>

        <section aria-labelledby="today-sets">
          <h2 id="today-sets" className="eyebrow mb-2 lg:mt-0">Today</h2>
          {todaysSets.length === 0 ? (
            <Empty title="No sets yet">They appear here as you add them.</Empty>
          ) : (
            <Panel className="divide-y divide-border">
              {byExercise(todaysSets).map((group) => (
                <div key={group.exercise_id} className="py-2">
                  <h3 className="px-4 pb-1 pt-1 text-sm font-semibold">{group.exercise_name}</h3>
                  <ol>
                    {group.sets.map((s, i) => (
                      <li key={s.id} className="flex items-center justify-between gap-2 pl-4 pr-1">
                        <span className="tabular text-[15px]">
                          <span className="mr-3 inline-block w-4 text-sm text-muted-foreground">{i + 1}</span>
                          {formatWeight(s.weight_kg, units)} × {s.reps}
                        </span>
                        <IconButton label={`Remove set ${i + 1} of ${group.exercise_name}`} onClick={() => remove(s)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </Panel>
          )}
        </section>
      </div>

      <Sheet open={repeating && Boolean(last)} onClose={() => { setRepeating(false); router.replace('/log'); }} title="Repeat last workout">
        {last && (
          <>
            <p className="text-sm text-muted-foreground">Same sets as {weekday(last.day)}, logged for today. You can remove any after.</p>
            <ul className="my-4 divide-y divide-border rounded-lg bg-muted/60 text-sm">
              {byExercise(last.sets).map((g) => (
                <li key={g.exercise_id} className="flex justify-between gap-3 px-3 py-2">
                  <span className="font-medium">{g.exercise_name}</span>
                  <span className="tabular text-muted-foreground">
                    {g.sets.map((s) => `${Math.round(fromKg(s.weight_kg, units) * 10) / 10}×${s.reps}`).join('  ')}
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
  const q = query.trim().toLowerCase();
  const matches = exercises.filter((e) => e.name.toLowerCase().includes(q));
  const exact = exercises.some((e) => e.name.toLowerCase() === q);
  const groups = CATEGORIES.map((c) => ({ category: c, items: matches.filter((e) => e.category === c) })).filter((g) => g.items.length);

  return (
    <Sheet open={open} onClose={onClose} title="Choose an exercise">
      <label className="relative block">
        <span className="sr-only">Search exercises</span>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input className={cx(inputClass, 'pl-9')} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" autoComplete="off" />
      </label>
      <div className="mt-3 max-h-[50dvh] overflow-y-auto">
        {groups.map((g) => (
          <div key={g.category} className="mb-2">
            <h3 className="eyebrow px-1 py-1">{g.category}</h3>
            <ul>
              {g.items.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => onPick(e.id)} className="flex min-h-11 w-full items-center rounded-lg px-2 text-left hover:bg-muted">
                    {e.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {q && !exact && (
        <form
          className="mt-3 space-y-3 rounded-xl bg-muted/60 p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const row = await actions.addExercise(query, category);
            setQuery('');
            onPick(row.id);
          }}
        >
          <p className="text-sm">
            New exercise: <strong>{query.trim()}</strong>
          </p>
          <Select label="Body part" value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
          <Button type="submit" block>
            Add exercise
          </Button>
        </form>
      )}
      {!groups.length && !q && <Empty title="No exercises" />}
    </Sheet>
  );
}

export default function LogPage() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <LogScreen />
    </Suspense>
  );
}
