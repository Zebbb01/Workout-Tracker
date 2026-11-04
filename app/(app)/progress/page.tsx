'use client';

import { useState } from 'react';
import { Award, Check } from 'lucide-react';
import { useMeals, useProfile, useSets, useWeights } from '@/lib/data';
import { addDays, exerciseProgress, formatWeight, fromKg, localDay, milestones, recentExercises, totals, unitLabel, weeklyVolume, weightSeries } from '@/lib/calc';
import { Empty, PageHeader, Panel, ScreenSkeleton, Segmented, Select, cx } from '@/components/ui';
import { SyncBadge } from '@/components/Shell';
import { ColumnChart, TrendChart } from '@/components/charts';
import { WeightForm } from '@/components/WeightForm';

const short = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const RANGES = { '30': 30, '90': 90, all: 3650 } as const;

export default function ProgressPage() {
  const profile = useProfile();
  const sets = useSets();
  const meals = useMeals();
  const weights = useWeights();
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const [range, setRange] = useState<keyof typeof RANGES>('90');

  if (!profile || !sets || !meals || !weights) return <ScreenSkeleton />;

  const units = profile.units;
  const today = localDay(new Date());
  const series = weightSeries(weights, addDays(today, -RANGES[range]));
  const exercises = recentExercises(sets, 50);
  const exerciseId = picked ?? exercises[0]?.id;
  const progress = exerciseId ? exerciseProgress(sets, exerciseId) : [];
  const volume = weeklyVolume(sets, today);
  const oneDecimal = (kg: number) => formatWeight(kg, units);
  const whole = (kg: number) => `${Math.round(fromKg(kg, units)).toLocaleString()} ${unitLabel(units)}`;
  const axis = (kg: number) => String(Math.round(fromKg(kg, units)));
  const change = series.length > 1 ? series[series.length - 1].kg - series[0].kg : null;

  const days = Array.from({ length: 14 }, (_, i) => addDays(today, -i)).map((day) => ({
    day,
    sets: sets.filter((s) => localDay(s.performed_at) === day).length,
    kcal: totals(meals.filter((m) => localDay(m.eaten_at) === day)).calories,
    weight: [...weights].reverse().find((w) => w.measured_on === day)?.weight_kg,
  }));
  const logged = days.filter((d) => d.sets || d.kcal || d.weight);

  return (
    <>
      <PageHeader title="Progress" action={<SyncBadge className="lg:hidden" />} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel aria-labelledby="weight-chart" className="p-4 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="weight-chart" className="eyebrow">Weight</h2>
              {series.length > 0 && (
                <p className="mt-0.5">
                  <span className="font-display tabular text-2xl font-bold">{oneDecimal(series[series.length - 1].kg)}</span>
                  {change !== null && (
                    <span className="tabular ml-2 text-sm text-muted-foreground">
                      {change > 0 ? '+' : change < 0 ? '−' : '±'}
                      {formatWeight(Math.abs(change), units)} since {short(series[0].day)}
                    </span>
                  )}
                </p>
              )}
            </div>
            <Segmented label="Range" hideLabel fit value={range} onChange={setRange} options={[{ value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: 'all', label: 'All' }]} />
          </div>
          {series.length > 1 ? (
            <div className="mt-3">
              <TrendChart title="Weight" points={series.map((p) => ({ label: short(p.day), value: p.kg }))} format={oneDecimal} axisFormat={axis} />
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-muted-foreground">{series.length ? 'One more weigh-in and your trend starts.' : 'Weigh in to start your trend.'}</p>
              {!series.some((p) => p.day === today) && <WeightForm units={units} />}
            </div>
          )}
        </Panel>

        <Panel aria-labelledby="lift-chart" className="p-4">
          <h2 id="lift-chart" className="eyebrow">Strength</h2>
          {exerciseId ? (
            <>
              <div className="mt-2">
                <Select label="Exercise" hideLabel value={exerciseId} onChange={setPicked} options={exercises.map((e) => ({ value: e.id, label: e.name }))} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Best estimated one-rep max per day</p>
              <div className="mt-1">
                <TrendChart title="Best estimated one-rep max" points={progress.map((p) => ({ label: short(p.day), value: p.value }))} format={oneDecimal} axisFormat={axis} />
              </div>
            </>
          ) : (
            <div className="mt-2">
              <Empty title="No sets yet">Your strength trend starts with your first set.</Empty>
            </div>
          )}
        </Panel>

        <Panel aria-labelledby="volume-chart" className="p-4">
          <h2 id="volume-chart" className="eyebrow">Weekly volume</h2>
          {volume.some((w) => w.volume > 0) ? (
            <>
              <p className="mt-2 text-xs text-muted-foreground">Weight × reps, per week</p>
              <div className="mt-1">
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
            </>
          ) : (
            <div className="mt-2">
              <Empty title="No volume yet">Weekly totals appear after your first workout.</Empty>
            </div>
          )}
        </Panel>

        <Panel aria-labelledby="history" className="p-4 lg:col-span-2">
          <h2 id="history" className="eyebrow">Last 14 days</h2>
          {logged.length ? (
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th scope="col" className="py-1.5 font-medium">Day</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Sets</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Calories</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Weight</th>
                </tr>
              </thead>
              <tbody>
                {logged.map((d) => (
                  <tr key={d.day} className="tabular border-t border-border">
                    <th scope="row" className="py-2 text-left font-medium">{d.day === today ? 'Today' : short(d.day)}</th>
                    <td className="py-2 text-right">{d.sets || <span className="text-muted-foreground">–</span>}</td>
                    <td className="py-2 text-right">{d.kcal ? d.kcal.toLocaleString() : <span className="text-muted-foreground">–</span>}</td>
                    <td className="py-2 text-right">{d.weight ? formatWeight(d.weight, units) : <span className="text-muted-foreground">–</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Nothing logged in the last two weeks.</p>
          )}
        </Panel>

        <section aria-labelledby="milestones" className="lg:col-span-2">
          <h2 id="milestones" className="eyebrow mb-2">Milestones</h2>
          <ul className="flex flex-wrap gap-2">
            {milestones({ sets, meals, weights }).map((m) => (
              <li
                key={m.id}
                className={cx(
                  'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium',
                  m.done ? 'bg-primary/10 text-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {m.done ? <Check size={15} className="text-accent" aria-hidden /> : <Award size={15} aria-hidden />}
                <span className="sr-only">{m.done ? 'Reached: ' : 'Not yet: '}</span>
                {m.label}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
