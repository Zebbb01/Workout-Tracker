'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useActions } from '@/lib/data';
import { formatWeight, fromKg, toKg, unitLabel } from '@/lib/calc';
import type { Units, WeightEntry } from '@/lib/types';
import { Button, NumberInput, useToast } from './ui';

/** Today's weight in one field and one tap; once saved, a quiet line with a Change button. */
export function WeightForm({ units, today }: { units: Units; today?: WeightEntry }) {
  const actions = useActions();
  const toast = useToast();
  const [editing, setEditing] = useState(!today);
  const [value, setValue] = useState(today ? String(Math.round(fromKg(today.weight_kg, units) * 10) / 10) : '');
  const [error, setError] = useState<string | null>(null);

  if (today && !editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 py-1 pl-3 pr-1 text-sm">
        <p className="flex items-center gap-1.5">
          <Check size={15} className="text-positive" aria-hidden />
          Logged today: <span className="tabular font-semibold">{formatWeight(today.weight_kg, units)}</span>
        </p>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const kg = toKg(Number(value), units);
        if (!(kg >= 20 && kg <= 400)) {
          setError(`Enter a weight between ${Math.round(fromKg(20, units))} and ${Math.round(fromKg(400, units))} ${unitLabel(units)}.`);
          return;
        }
        setError(null);
        await actions.saveWeight(kg);
        setEditing(false);
        toast({ message: `Weight saved: ${formatWeight(kg, units)}` });
      }}
    >
      <label className="min-w-0 flex-1">
        <span className="mb-1.5 block text-sm font-medium">Today&apos;s weight ({unitLabel(units)})</span>
        <NumberInput value={value} onChange={setValue} placeholder={units === 'metric' ? '72.5' : '160'} aria-invalid={Boolean(error)} />
      </label>
      <Button type="submit">Save</Button>
      {error && (
        <p role="alert" className="basis-full text-sm text-negative">
          {error}
        </p>
      )}
    </form>
  );
}
