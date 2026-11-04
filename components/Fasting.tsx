'use client';

import { useEffect, useState } from 'react';
import { useActions } from '@/lib/data';
import { fastProgress, formatDuration } from '@/lib/calc';
import type { Fast } from '@/lib/types';
import { Button, Panel, Ring, Segmented, useToast } from './ui';

function useMinuteClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** The running fast; with `canStart`, a way to start one when none is running. */
export function FastingCard({ fast, canStart = false }: { fast?: Fast; canStart?: boolean }) {
  const actions = useActions();
  const toast = useToast();
  const now = useMinuteClock();
  const [hours, setHours] = useState('16');

  if (fast) {
    const { hours: elapsed, done } = fastProgress(fast, now);
    return (
      <Panel aria-label="Fasting" className="flex items-center gap-4 p-4">
        <Ring value={Math.min(elapsed, fast.target_hours)} max={fast.target_hours} size={64} stroke={6} label="Fast progress">
          <span className="tabular text-xs font-semibold">{Math.floor((Math.min(elapsed, fast.target_hours) / fast.target_hours) * 100)}%</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <h2 className="eyebrow">Fasting</h2>
          <p className="font-display tabular text-xl font-bold">
            {formatDuration(elapsed)} <span className="text-sm font-normal text-muted-foreground">of {fast.target_hours}h</span>
          </p>
          {done && <p className="text-sm text-positive">Target reached</p>}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await actions.endFast(fast.id);
            toast({ message: `Fast ended at ${formatDuration(elapsed)}` });
          }}
        >
          End
        </Button>
      </Panel>
    );
  }

  if (!canStart) return null;
  return (
    <Panel aria-label="Fasting timer" className="flex flex-wrap items-end justify-between gap-3 p-4">
      <div>
        <h2 className="eyebrow mb-2">Fasting timer</h2>
        <Segmented label="Fast for" hideLabel fit value={hours} onChange={setHours} options={['12', '14', '16', '18'].map((h) => ({ value: h, label: `${h}h` }))} />
      </div>
      <Button
        variant="secondary"
        onClick={async () => {
          await actions.startFast(Number(hours));
          toast({ message: `${hours}-hour fast started` });
        }}
      >
        Start fast
      </Button>
    </Panel>
  );
}
