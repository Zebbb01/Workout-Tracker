'use client';

import Link from 'next/link';
import { Dumbbell, Repeat, Scale, Utensils } from 'lucide-react';
import { useData, useFasts, useMeals, useProfile, useSets, useWeights } from '@/lib/data';
import { byExercise, formatWeight, lastWorkout, localDay, totals, weightSeries, weightTrend } from '@/lib/calc';
import { ButtonLink, Card, Loading, Meter, PageHeader } from '@/components/ui';
import { SyncBadge } from '@/components/Shell';
import { WeightForm } from '@/components/WeightForm';
import { FastingCard } from '@/components/Fasting';
import InstallApp, { useInstall } from '@/components/InstallApp';

const dayName = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });

/** "How am I doing today?" at a glance: food left, today's training, weight trend, a running fast. */
export default function TodayPage() {
  const { user } = useData();
  const profile = useProfile();
  const sets = useSets();
  const meals = useMeals();
  const weights = useWeights();
  const fasts = useFasts();
  const install = useInstall();

  if (!profile || !sets || !meals || !weights || !fasts) return <Loading />;

  const today = localDay(new Date());
  const units = profile.units;
  const eaten = totals(meals.filter((m) => localDay(m.eaten_at) === today));
  const target = { calories: profile.calories ?? 2000, protein_g: profile.protein_g ?? 0, carbs_g: profile.carbs_g ?? 0, fat_g: profile.fat_g ?? 0 };
  const left = target.calories - eaten.calories;
  const todaysSets = sets.filter((s) => localDay(s.performed_at) === today);
  const last = lastWorkout(sets, today);
  const trend = weightTrend(weightSeries(weights));
  const todaysWeight = [...weights].reverse().find((w) => w.measured_on === today);
  const fast = fasts.find((f) => !f.ended_at);

  return (
    <>
      <PageHeader title="Today" subtitle={dayName(today)} action={<SyncBadge />} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card aria-labelledby="food-title" className="lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="food-title" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Utensils size={16} aria-hidden /> Food
              </h2>
              <p className="tabular mt-1 text-3xl font-bold">
                {Math.abs(left).toLocaleString()} <span className="text-lg font-semibold">kcal {left >= 0 ? 'left' : 'over'}</span>
              </p>
              <p className="tabular text-sm text-muted-foreground">
                {eaten.calories.toLocaleString()} of {target.calories.toLocaleString()} eaten
              </p>
            </div>
            <ButtonLink href="/meals?add=1">Add meal</ButtonLink>
          </div>
          <div className="mt-3">
            <Meter value={eaten.calories} max={target.calories} label="Calories eaten" tone={left < 0 ? 'negative' : 'primary'} />
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3">
            {(
              [
                ['Protein', eaten.protein_g, target.protein_g],
                ['Carbs', eaten.carbs_g, target.carbs_g],
                ['Fat', eaten.fat_g, target.fat_g],
              ] as const
            ).map(([name, value, goal]) => (
              <div key={name}>
                <dt className="text-sm text-muted-foreground">{name}</dt>
                <dd className="tabular font-semibold">
                  {Math.round(value)}
                  <span className="font-normal text-muted-foreground"> / {goal} g</span>
                </dd>
                <div className="mt-1">
                  <Meter value={value} max={goal} label={`${name} eaten`} />
                </div>
              </div>
            ))}
          </dl>
        </Card>

        <Card aria-labelledby="workout-title">
          <h2 id="workout-title" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Dumbbell size={16} aria-hidden /> Workout
          </h2>
          {todaysSets.length ? (
            <>
              <p className="mt-1 text-xl font-bold">
                {todaysSets.length} {todaysSets.length === 1 ? 'set' : 'sets'} today
              </p>
              <ul className="mt-1 text-sm text-muted-foreground">
                {byExercise(todaysSets).map((g) => (
                  <li key={g.exercise_id}>
                    {g.exercise_name} · {g.sets.length} {g.sets.length === 1 ? 'set' : 'sets'}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-xl font-bold">No sets yet today</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink href="/log" variant={todaysSets.length || !last ? 'primary' : 'secondary'}>
              Log a set
            </ButtonLink>
            {!todaysSets.length && last && (
              <ButtonLink href="/log?repeat=1">
                <Repeat size={18} aria-hidden /> Repeat {new Date(`${last.day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long' })}
              </ButtonLink>
            )}
          </div>
        </Card>

        <Card aria-labelledby="weight-title">
          <h2 id="weight-title" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Scale size={16} aria-hidden /> Weight
          </h2>
          {trend ? (
            <p className="mt-1">
              <span className="tabular text-xl font-bold">{formatWeight(trend.latest.kg, units)}</span>
              {trend.change !== null && (
                <span className="tabular ml-2 text-sm text-muted-foreground">
                  {trend.change > 0 ? '+' : trend.change < 0 ? '−' : '±'}
                  {formatWeight(Math.abs(trend.change), units)} in a week or more
                </span>
              )}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Weigh in to start your trend.</p>
          )}
          <div className="mt-3">
            <WeightForm key={todaysWeight?.id ?? 'new'} units={units} today={todaysWeight} />
          </div>
          {trend && (
            <Link href="/progress" className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-accent underline-offset-4 hover:underline">
              See your trend
            </Link>
          )}
        </Card>

        {fast && (
          <div className="lg:col-span-2">
            <FastingCard fast={fast} />
          </div>
        )}

        {user?.is_anonymous && (sets.length > 0 || meals.length > 0 || weights.length > 0) && (
          <Card className="lg:col-span-2">
            <p className="font-semibold">Keep what you&apos;ve logged</p>
            <p className="mt-1 text-sm text-muted-foreground">You&apos;re trying Body Tracker without an account. Save your data with Google to keep it past 30 days and on other devices.</p>
            <ButtonLink href="/more" variant="secondary" className="mt-3">
              Save with Google
            </ButtonLink>
          </Card>
        )}

        {install && (
          <Card className="lg:col-span-2">
            <p className="font-semibold">Add Body Tracker to your home screen</p>
            <p className="mb-3 mt-1 text-sm text-muted-foreground">It opens in its own window and works at the gym with no signal.</p>
            <InstallApp />
          </Card>
        )}
      </div>
    </>
  );
}
