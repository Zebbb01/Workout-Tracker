'use client';

import Link from 'next/link';
import { Download, Plus, Repeat, ShieldCheck } from 'lucide-react';
import { useData, useFasts, useMeals, useProfile, useSets, useWeights } from '@/lib/data';
import { addDays, byExercise, estimatedMax, formatWeight, lastWorkout, localDay, totals, weightSeries, weightTrend } from '@/lib/calc';
import { ButtonLink, List, Meter, PageHeader, Panel, Ring, Row, ScreenSkeleton } from '@/components/ui';
import { SyncBadge } from '@/components/Shell';
import { WeightForm } from '@/components/WeightForm';
import { FastingCard } from '@/components/Fasting';
import { Sparkline } from '@/components/charts';
import { installApp, useInstall } from '@/components/InstallApp';

const dayName = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
const weekday = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long' });
const short = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** "How am I doing today?" at a glance: food left, today's training, weight trend, a running fast. */
export default function TodayPage() {
  const { user } = useData();
  const profile = useProfile();
  const sets = useSets();
  const meals = useMeals();
  const weights = useWeights();
  const fasts = useFasts();
  const install = useInstall();

  if (!profile || !sets || !meals || !weights || !fasts) return <ScreenSkeleton />;

  const today = localDay(new Date());
  const units = profile.units;
  const todaysMeals = meals.filter((m) => localDay(m.eaten_at) === today);
  const eaten = totals(todaysMeals);
  const target = { calories: profile.calories ?? 2000, protein_g: profile.protein_g ?? 0, carbs_g: profile.carbs_g ?? 0, fat_g: profile.fat_g ?? 0 };
  const left = target.calories - eaten.calories;
  const todaysSets = sets.filter((s) => localDay(s.performed_at) === today);
  const last = lastWorkout(sets, today);
  const series = weightSeries(weights, addDays(today, -30));
  const trend = weightTrend(weightSeries(weights));
  const todaysWeight = [...weights].reverse().find((w) => w.measured_on === today);
  const fast = fasts.find((f) => !f.ended_at);
  const hasEntries = sets.length > 0 || meals.length > 0 || weights.length > 0;

  return (
    <>
      <PageHeader title="Today" subtitle={dayName(today)} action={<SyncBadge className="lg:hidden" />} />

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Food: the ring answers "how much is left", the bars say what it is made of. */}
        <Panel aria-label="Food" className="p-4 lg:col-span-3 lg:p-5">
          <div className="flex items-center gap-5">
            <Ring value={eaten.calories} max={target.calories} tone={left < 0 ? 'negative' : 'brand'} label="Calories eaten" size={124}>
              <span className="font-display tabular text-3xl font-bold leading-none">{Math.abs(left).toLocaleString()}</span>
              <span className="mt-1 text-xs text-muted-foreground">{left >= 0 ? 'kcal left' : 'kcal over'}</span>
            </Ring>
            <ul className="flex-1 space-y-3" aria-label="Macros eaten">
              {(
                [
                  ['Protein', eaten.protein_g, target.protein_g, 'protein'],
                  ['Carbs', eaten.carbs_g, target.carbs_g, 'carbs'],
                  ['Fat', eaten.fat_g, target.fat_g, 'fat'],
                ] as const
              ).map(([name, value, goal, tone]) => (
                <li key={name}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{name}</span>
                    <span className="tabular text-muted-foreground">
                      <span className="font-semibold text-foreground">{Math.round(value)}</span> / {goal} g
                    </span>
                  </div>
                  <Meter value={value} max={goal} label={`${name} eaten`} tone={tone} />
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
            <p className="tabular text-sm text-muted-foreground">
              {eaten.calories.toLocaleString()} of {target.calories.toLocaleString()} kcal eaten
            </p>
            <ButtonLink href="/meals?add=1" size="sm">
              <Plus size={16} aria-hidden /> Add meal
            </ButtonLink>
          </div>
          {todaysMeals.length > 0 && (
            <ul className="mt-1 divide-y divide-border text-sm" aria-label="Eaten today">
              {todaysMeals.map((m) => (
                <li key={m.id} className="flex justify-between gap-3 py-2">
                  <span className="truncate">{m.name}</span>
                  <span className="tabular shrink-0 text-muted-foreground">{m.calories.toLocaleString()} kcal</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="grid gap-4 lg:col-span-2 lg:content-start">
          <Panel aria-label="Workout" className="p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="eyebrow">Workout</h2>
              <ButtonLink href="/log" size="sm" variant={todaysSets.length || !last ? 'primary' : 'secondary'}>
                Log a set
              </ButtonLink>
            </div>
            {todaysSets.length ? (
              <>
                <p className="font-display mt-1 text-xl font-bold">
                  {todaysSets.length} {todaysSets.length === 1 ? 'set' : 'sets'} today
                </p>
                <ul className="mt-1 space-y-1" aria-label="Today's exercises">
                  {byExercise(todaysSets).map((g) => {
                    const best = g.sets.reduce((a, b) => (estimatedMax(b.weight_kg, b.reps) > estimatedMax(a.weight_kg, a.reps) ? b : a));
                    return (
                      <li key={g.exercise_id} className="flex justify-between gap-3 text-sm">
                        <span>{g.exercise_name}</span>
                        <span className="tabular text-muted-foreground">
                          {g.sets.length} × · top {formatWeight(best.weight_kg, units)} × {best.reps}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">No sets yet today</p>
                {last && (
                  <ButtonLink href="/log?repeat=1" size="sm" variant="primary">
                    <Repeat size={15} aria-hidden /> Repeat {weekday(last.day)}
                  </ButtonLink>
                )}
              </div>
            )}
          </Panel>

          <Panel aria-label="Weight" className="p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="eyebrow">Weight</h2>
              {trend && (
                <Link href="/progress" className="text-sm font-medium text-accent underline-offset-4 hover:underline">
                  See trend
                </Link>
              )}
            </div>
            {trend && (
              <div className="mt-1 flex items-center justify-between gap-3">
                <p>
                  <span className="font-display tabular block text-2xl font-bold">{formatWeight(trend.latest.kg, units)}</span>
                  {trend.change !== null && trend.since && (
                    <span className="tabular text-sm text-muted-foreground">
                      {trend.change > 0 ? '+' : trend.change < 0 ? '−' : '±'}
                      {formatWeight(Math.abs(trend.change), units)} since {short(trend.since)}
                    </span>
                  )}
                </p>
                <Sparkline values={series.map((p) => p.kg)} />
              </div>
            )}
            <div className="mt-3">
              <WeightForm key={todaysWeight?.id ?? 'new'} units={units} today={todaysWeight} />
            </div>
          </Panel>

          {fast && <FastingCard fast={fast} />}
        </div>
      </div>

      {(user?.is_anonymous && hasEntries) || install ? (
        <List className="mt-4">
          {user?.is_anonymous && hasEntries && (
            <Row icon={<ShieldCheck size={18} />} label="Keep what you've logged" detail="Save it with Google" href="/more" tone="accent" />
          )}
          {install === 'prompt' && <Row icon={<Download size={18} />} label="Install the app" detail="Its own window, works offline" onClick={installApp} />}
          {install === 'ios' && <Row icon={<Download size={18} />} label="Add to Home Screen" detail="Tap Share, then Add to Home Screen" />}
        </List>
      ) : null}
    </>
  );
}
