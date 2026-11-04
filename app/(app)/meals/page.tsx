'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useActions, useFasts, useMeals, useProfile } from '@/lib/data';
import { addDays, localDay, totals } from '@/lib/calc';
import type { Meal, MealType } from '@/lib/types';
import { Button, Empty, IconButton, Meter, PageHeader, Panel, Ring, ScreenSkeleton, useToast } from '@/components/ui';
import { MealSheet } from '@/components/MealSheet';
import { FastingCard } from '@/components/Fasting';

const ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const TITLES: Record<MealType, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' };

function dayTitle(day: string, today: string) {
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function MealsScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const profile = useProfile();
  const meals = useMeals();
  const fasts = useFasts();
  const actions = useActions();
  const toast = useToast();
  const today = localDay(new Date());
  const [day, setDay] = useState(today);
  const [adding, setAdding] = useState(params.get('add') === '1');

  if (!profile || !meals || !fasts) return <ScreenSkeleton />;

  const dayMeals = meals.filter((m) => localDay(m.eaten_at) === day);
  const eaten = totals(dayMeals);
  const target = profile.calories ?? 2000;

  async function remove(meal: Meal) {
    await actions.remove('meals', meal.id);
    toast({ message: `${meal.name} removed`, undo: () => actions.restore('meals', meal.id) });
  }

  const switcher = (
    <div className="flex items-center rounded-lg bg-muted p-0.5">
      <IconButton label="Previous day" onClick={() => setDay(addDays(day, -1))} className="size-9 lg:size-8">
        <ChevronLeft size={18} />
      </IconButton>
      <h2 className="min-w-24 text-center text-sm font-semibold" aria-live="polite">{dayTitle(day, today)}</h2>
      <IconButton label="Next day" onClick={() => setDay(addDays(day, 1))} disabled={day >= today} className="size-9 lg:size-8">
        <ChevronRight size={18} />
      </IconButton>
    </div>
  );

  return (
    <>
      <PageHeader title="Meals" action={switcher} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:items-start">
        <div className="space-y-4 lg:col-span-2">
          <Panel aria-label="Day total" className="p-4">
            <div className="flex items-center gap-4">
              <Ring value={eaten.calories} max={target} size={84} stroke={8} tone={eaten.calories > target ? 'negative' : 'brand'} label="Calories eaten">
                <span className="font-display tabular text-lg font-bold leading-none">{eaten.calories.toLocaleString()}</span>
                <span className="text-[11px] text-muted-foreground">kcal</span>
              </Ring>
              <div className="flex-1">
                <p className="tabular text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{Math.abs(target - eaten.calories).toLocaleString()}</span>{' '}
                  kcal {eaten.calories > target ? 'over' : 'left'} · goal {target.toLocaleString()}
                </p>
                <dl className="mt-2 grid grid-cols-3 gap-3">
                  {(
                    [
                      ['Protein', eaten.protein_g, profile.protein_g ?? 0, 'protein'],
                      ['Carbs', eaten.carbs_g, profile.carbs_g ?? 0, 'carbs'],
                      ['Fat', eaten.fat_g, profile.fat_g ?? 0, 'fat'],
                    ] as const
                  ).map(([name, value, goal, tone]) => (
                    <div key={name}>
                      <dt className="text-xs text-muted-foreground">{name}</dt>
                      <dd className="tabular text-sm font-semibold">
                        {Math.round(value)}
                        <span className="font-normal text-muted-foreground">/{goal}g</span>
                        <div className="mt-1">
                          <Meter value={value} max={goal} label={`${name} eaten`} tone={tone} />
                        </div>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
            <Button block className="mt-4" onClick={() => setAdding(true)}>
              <Plus size={18} aria-hidden /> Add meal
            </Button>
          </Panel>

          <FastingCard fast={fasts.find((f) => !f.ended_at)} canStart />
        </div>

        <section aria-label="Meals eaten" className="lg:col-span-3">
          {dayMeals.length === 0 ? (
            <Empty title={`Nothing logged ${day === today ? 'today' : 'this day'}`}>Snap a photo, describe it, or type the numbers.</Empty>
          ) : (
            <Panel className="divide-y divide-border">
              {ORDER.filter((t) => dayMeals.some((m) => m.meal_type === t)).map((type) => (
                <div key={type} className="py-2">
                  <div className="flex items-baseline justify-between px-4 pb-1 pt-1">
                    <h3 className="eyebrow">{TITLES[type]}</h3>
                    <span className="tabular text-xs text-muted-foreground">
                      {totals(dayMeals.filter((m) => m.meal_type === type)).calories.toLocaleString()} kcal
                    </span>
                  </div>
                  <ul>
                    {dayMeals
                      .filter((m) => m.meal_type === type)
                      .map((m) => (
                        <li key={m.id} className="flex items-center gap-3 py-1.5 pl-4 pr-1">
                          <div className="min-w-0 flex-1">
                            <p className="flex min-w-0 items-center gap-1.5 font-medium">
                              <span className="truncate">{m.name}</span>
                              {m.source === 'photo' && (
                                <>
                                  <Camera size={13} className="shrink-0 text-muted-foreground" aria-hidden />
                                  <span className="sr-only">From a photo</span>
                                </>
                              )}
                            </p>
                            <p className="tabular text-xs text-muted-foreground">
                              P {Math.round(m.protein_g)} · C {Math.round(m.carbs_g)} · F {Math.round(m.fat_g)}
                            </p>
                          </div>
                          <span className="tabular text-sm font-semibold">{m.calories} kcal</span>
                          <IconButton label={`Remove ${m.name}`} onClick={() => remove(m)}>
                            <Trash2 size={16} />
                          </IconButton>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </Panel>
          )}
        </section>
      </div>

      <MealSheet
        open={adding}
        day={day}
        onClose={() => {
          setAdding(false);
          if (params.get('add')) router.replace('/meals');
        }}
      />
    </>
  );
}

export default function MealsPage() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <MealsScreen />
    </Suspense>
  );
}
