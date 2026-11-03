'use client';

import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { useActions } from '@/lib/data';
import { fastProgress, formatDuration } from '@/lib/calc';
import type { Fast } from '@/lib/types';
import { Button, Card, Meter, Segmented, useToast } from './ui';

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
    const { hours: elapsed, fraction, done } = fastProgress(fast, now);
    return (
      <Card aria-labelledby="fast-title">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 id="fast-title" className="flex items-center gap-2 font-semibold">
            <Timer size={18} aria-hidden /> Fasting
          </h2>
          <Button
            variant="secondary"
            onClick={async () => {
              await actions.endFast(fast.id);
              toast({ message: `Fast ended at ${formatDuration(elapsed)}` });
            }}
          >
            End fast
          </Button>
        </div>
        <p className="tabular text-2xl font-bold">
          {formatDuration(elapsed)} <span className="text-base font-normal text-muted-foreground">of {fast.target_hours}h</span>
        </p>
        <div className="mt-2">
          <Meter value={fraction * fast.target_hours} max={fast.target_hours} label="Fast progress" />
        </div>
        {done && <p className="mt-2 text-sm text-positive">Target reached. End it whenever you eat.</p>}
      </Card>
    );
  }

  if (!canStart) return null;
  return (
    <Card aria-labelledby="fast-title">
      <h2 id="fast-title" className="mb-3 flex items-center gap-2 font-semibold">
        <Timer size={18} aria-hidden /> Fasting timer
      </h2>
      <Segmented
        label="Fast for"
        value={hours}
        onChange={setHours}
        options={['12', '14', '16', '18'].map((h) => ({ value: h, label: `${h}h` }))}
      />
      <Button
        className="mt-3"
        block
        variant="secondary"
        onClick={async () => {
          await actions.startFast(Number(hours));
          toast({ message: `${hours}-hour fast started` });
        }}
      >
        Start fast
      </Button>
    </Card>
  );
}
