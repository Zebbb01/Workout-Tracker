'use client';

import { useState } from 'react';
import { Check, Circle } from 'lucide-react';
import { useMeals, useProfile, useSets, useWeights } from '@/lib/data';
import { addDays, exerciseProgress, formatWeight, fromKg, localDay, milestones, recentExercises, totals, unitLabel, weeklyVolume, weightSeries } from '@/lib/calc';
import { Card, Empty, Loading, PageHeader, inputClass } from '@/components/ui';
import { SyncBadge } from '@/components/Shell';
import { ColumnChart, TrendChart } from '@/components/charts';
import { WeightForm } from '@/components/WeightForm';

const short = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export default function ProgressPage() {
  const profile = useProfile();
  const sets = useSets();
  const meals = useMeals();
  const weights = useWeights();
  const [picked, setPicked] = useState<string | null>(null);

  if (!profile || !sets || !meals || !weights) return <Loading />;

  const units = profile.units;
  const today = localDay(new Date());
  const series = weightSeries(weights, addDays(today, -90));
  const exercises = recentExercises(sets, 50);
  const exerciseId = picked ?? exercises[0]?.id ?? null;
  const progress = exerciseId ? exerciseProgress(sets, exerciseId) : [];
  const volume = weeklyVolume(sets, today);
  const oneDecimal = (kg: number) => formatWeight(kg, units);
  const whole = (kg: number) => `${Math.round(fromKg(kg, units)).toLocaleString()} ${unitLabel(units)}`;

  const days = Array.from({ length: 14 }, (_, i) => addDays(today, -i)).map((day) => ({
    day,
    sets: sets.filter((s) => localDay(s.performed_at) === day).length,
    kcal: totals(meals.filter((m) => localDay(m.eaten_at) === day)).calories,
    weight: [...weights].reverse().find((w) => w.measured_on === day)?.weight_kg,
  }));
  const logged = days.filter((d) => d.sets || d.kcal || d.weight);

  return (
    <>
      <PageHeader title="Progress" action={<SyncBadge />} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card aria-labelledby="weight-chart" className="lg:col-span-2">
          <h2 id="weight-chart" className="font-semibold">Weight, last 90 days</h2>
          {series.length ? (
            <div className="mt-3">
              <TrendChart title="Weight, last 90 days" points={series.map((p) => ({ label: short(p.day), value: p.kg }))} format={oneDecimal} axisFormat={(kg) => String(Math.round(fromKg(kg, units)))} />
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <Empty title="No weigh-ins yet">Your trend starts with today&apos;s weight.</Empty>
              <WeightForm units={units} />
            </div>
          )}
        </Card>

        <Card aria-labelledby="lift-chart">
          <h2 id="lift-chart" className="font-semibold">Strength</h2>
          {exerciseId ? (
            <>
              <label className="mt-2 block">
                <span className="sr-only">Exercise</span>
                <select className={inputClass} value={exerciseId} onChange={(e) => setPicked(e.target.value)}>
                  {exercises.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </label>
              <p className="mt-2 text-sm text-muted-foreground">Best estimated one-rep max each day.</p>
              <div className="mt-2">
                <TrendChart title="Best estimated one-rep max" points={progress.map((p) => ({ label: short(p.day), value: p.value }))} format={oneDecimal} axisFormat={(kg) => String(Math.round(fromKg(kg, units)))} />
              </div>
            </>
          ) : (
            <div className="mt-3">
              <Empty title="No sets yet">Log a few sets and your strength trend appears here.</Empty>
            </div>
          )}
        </Card>

        <Card aria-labelledby="volume-chart">
          <h2 id="volume-chart" className="font-semibold">Weekly volume</h2>
          <p className="mt-1 text-sm text-muted-foreground">Weight × reps, summed per week.</p>
          <div className="mt-2">
            <ColumnChart
              title="Weekly volume"
              points={volume.map((w) => ({ label: `Week of ${short(w.week)}`, value: w.volume }))}
              format={whole}
              axisFormat={(kg) => {
                const v = fromKg(kg, units);
                return v >= 10000 ? `${Math.round(v / 1000)}K` : String(Math.round(v));
              }}
            />
          </div>
        </Card>

        <Card aria-labelledby="history" className="lg:col-span-2">
          <h2 id="history" className="font-semibold">Last 14 days</h2>
          {logged.length ? (
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th scope="col" className="py-2 font-medium">Day</th>
                  <th scope="col" className="py-2 text-right font-medium">Sets</th>
                  <th scope="col" className="py-2 text-right font-medium">Calories</th>
                  <th scope="col" className="py-2 text-right font-medium">Weight</th>
                </tr>
              </thead>
              <tbody>
                {logged.map((d) => (
                  <tr key={d.day} className="tabular border-t border-border">
                    <th scope="row" className="py-2 text-left font-normal">{d.day === today ? 'Today' : short(d.day)}</th>
                    <td className="py-2 text-right">{d.sets || '–'}</td>
                    <td className="py-2 text-right">{d.kcal ? d.kcal.toLocaleString() : '–'}</td>
                    <td className="py-2 text-right">{d.weight ? formatWeight(d.weight, units) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="mt-3">
              <Empty title="Nothing logged in the last two weeks" />
            </div>
          )}
        </Card>

        <Card aria-labelledby="milestones" className="lg:col-span-2">
          <h2 id="milestones" className="font-semibold">Milestones</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {milestones({ sets, meals, weights }).map((m) => (
              <li key={m.id} className={m.done ? '' : 'text-muted-foreground'}>
                <span className="flex items-center gap-2">
                  {m.done ? <Check size={18} className="text-positive" aria-hidden /> : <Circle size={18} aria-hidden />}
                  <span className="sr-only">{m.done ? 'Reached: ' : 'Not yet: '}</span>
                  {m.label}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
