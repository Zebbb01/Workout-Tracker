'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Plus, Repeat, Trash2 } from 'lucide-react';
import { useActions, useCustomExercises, useProfile, useSets } from '@/lib/data';
import { byExercise, formatWeight, fromKg, lastSetOf, lastWorkout, localDay, recentExercises, toKg, unitLabel } from '@/lib/calc';
import { EXERCISES } from '@/lib/exercises';
import type { Units, WorkoutSet } from '@/lib/types';
import { Button, ButtonLink, Chips, Empty, IconButton, PageHeader, Panel, ScreenSkeleton, Sheet, Stepper, useToast } from '@/components/ui';
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
  const [repeating, setRepeating] = useState(params.get('repeat') === '1');
  const [saving, setSaving] = useState(false);

  const units: Units = profile?.units ?? 'metric';
  const allExercises = useMemo(() => [...EXERCISES, ...(custom ?? []).map((e) => ({ id: e.id, name: e.name, category: e.category }))], [custom]);
  // Sent here from the exercise guide.
  const picked = params.get('exercise')?.slice(0, 60) ?? null;
  const pickedName = params.get('name')?.slice(0, 60) ?? null;
  const nameOf = (id: string) => allExercises.find((e) => e.id === id)?.name ?? sets?.find((s) => s.exercise_id === id)?.exercise_name ?? (id === picked && pickedName ? pickedName : id);

  const recent = useMemo(() => (sets ? recentExercises(sets) : []), [sets]);
  // Recent exercises first, then the common lifts, so one set logged never empties the row.
  const chips = [...recent, ...STARTERS.filter((id) => !recent.some((r) => r.id === id)).map((id) => ({ id, name: nameOf(id) }))].slice(0, 8);

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
  const current = draft ?? (picked ? startFor(picked) : recent[0] ? startFor(recent[0].id) : null);
  const inGuide = current !== null && !custom.some((e) => e.id === current.id);
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <Panel aria-label="Add a set" className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="eyebrow">Exercise</h2>
            <ButtonLink href="/log/guide" variant="ghost" size="sm">
              <BookOpen size={15} aria-hidden className="mr-1.5" /> Exercise guide
            </ButtonLink>
          </div>
          {/* One scrolling row on phones keeps the steppers within thumb reach. */}
          <div className="mt-1">
            <Chips label="Exercise" options={shownChips.map((e) => ({ value: e.id, label: e.name }))} value={current?.id} onChange={choose} />
          </div>

          {current ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-xl font-bold">{nameOf(current.id)}</p>
                  <p className="tabular text-sm text-muted-foreground">
                    {previous ? `Last time: ${formatWeight(previous.weight_kg, units)} × ${previous.reps}` : 'First time logging this one'}
                  </p>
                </div>
                {inGuide && (
                  <Link href={`/log/guide?e=${encodeURIComponent(current.id)}`} className="shrink-0 py-1 text-sm font-medium text-accent underline-offset-4 hover:underline">
                    How to do it
                  </Link>
                )}
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

    </>
  );
}

export default function LogPage() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <LogScreen />
    </Suspense>
  );
}
