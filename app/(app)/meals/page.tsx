'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useActions, useFasts, useMeals, useProfile } from '@/lib/data';
import { addDays, localDay, totals } from '@/lib/calc';
import type { Meal, MealType } from '@/lib/types';
import { Button, Card, Empty, IconButton, Loading, Meter, PageHeader, useToast } from '@/components/ui';
import { SyncBadge } from '@/components/Shell';
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

  if (!profile || !meals || !fasts) return <Loading />;

  const dayMeals = meals.filter((m) => localDay(m.eaten_at) === day);
  const eaten = totals(dayMeals);
  const target = profile.calories ?? 2000;

  async function remove(meal: Meal) {
    await actions.remove('meals', meal.id);
    toast({ message: `${meal.name} removed`, undo: () => actions.restore('meals', meal.id) });
  }

  return (
    <>
      <PageHeader title="Meals" action={<SyncBadge />} />

      <div className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-card p-1">
        <IconButton label="Previous day" onClick={() => setDay(addDays(day, -1))}>
          <ChevronLeft size={20} />
        </IconButton>
        <h2 className="font-semibold" aria-live="polite">{dayTitle(day, today)}</h2>
        <IconButton label="Next day" onClick={() => setDay(addDays(day, 1))} disabled={day >= today} className="disabled:opacity-30">
          <ChevronRight size={20} />
        </IconButton>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card aria-label="Day total" className="lg:col-span-2">
          <p className="tabular text-2xl font-bold">
            {eaten.calories.toLocaleString()} <span className="text-base font-normal text-muted-foreground">of {target.toLocaleString()} kcal</span>
          </p>
          <div className="mt-2">
            <Meter value={eaten.calories} max={target} label="Calories eaten" tone={eaten.calories > target ? 'negative' : 'primary'} />
          </div>
          <p className="tabular mt-3 text-sm text-muted-foreground">
            Protein {Math.round(eaten.protein_g)} / {profile.protein_g ?? 0} g · Carbs {Math.round(eaten.carbs_g)} / {profile.carbs_g ?? 0} g · Fat {Math.round(eaten.fat_g)} / {profile.fat_g ?? 0} g
          </p>
          <Button size="lg" block className="mt-4" onClick={() => setAdding(true)}>
            <Plus size={20} aria-hidden /> Add meal
          </Button>
        </Card>

        <section aria-label="Meals eaten" className="space-y-3 lg:col-span-2">
          {dayMeals.length === 0 ? (
            <Empty title={`Nothing logged ${day === today ? 'today' : 'this day'}`}>Add a meal by photo, a short description or the numbers.</Empty>
          ) : (
            ORDER.filter((t) => dayMeals.some((m) => m.meal_type === t)).map((type) => (
              <Card key={type} className="p-0">
                <h3 className="px-4 pt-3 font-semibold">{TITLES[type]}</h3>
                <ul className="divide-y divide-border">
                  {dayMeals
                    .filter((m) => m.meal_type === type)
                    .map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-2 py-2 pl-4 pr-1">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{m.name}</p>
                          <p className="tabular text-sm text-muted-foreground">
                            {m.calories} kcal · P {Math.round(m.protein_g)} · C {Math.round(m.carbs_g)} · F {Math.round(m.fat_g)}
                            {m.source === 'photo' && (
                              <span className="ml-2 inline-flex items-center gap-1">
                                <Camera size={14} aria-hidden />
                                <span className="sr-only">From a photo</span>
                              </span>
                            )}
                          </p>
                        </div>
                        <IconButton label={`Remove ${m.name}`} onClick={() => remove(m)}>
                          <Trash2 size={18} />
                        </IconButton>
                      </li>
                    ))}
                </ul>
              </Card>
            ))
          )}
        </section>

        <div className="lg:col-span-2">
          <FastingCard fast={fasts.find((f) => !f.ended_at)} canStart />
        </div>
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
    <Suspense fallback={<Loading />}>
      <MealsScreen />
    </Suspense>
  );
}
