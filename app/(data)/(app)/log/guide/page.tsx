'use client';

import { Suspense, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dumbbell, ExternalLink, Pause, Play, Search } from 'lucide-react';
import { useActions, useCustomExercises, useData } from '@/lib/data';
import { CATEGORIES } from '@/lib/exercises';
import { AREAS, GEAR, GUIDE, searchGuide, videoUrl, type GuideEntry } from '@/lib/guide';
import { BackLink, Button, ButtonLink, Chips, Empty, IconButton, List, PageHeader, Row, ScreenSkeleton, Sheet, cx, inputClass } from '@/components/ui';
import { Select } from '@/components/select';

const logHref = (e: { id: string; name: string }) => `/log?exercise=${encodeURIComponent(e.id)}&name=${encodeURIComponent(e.name)}`;

function detailOf(e: GuideEntry) {
  if (!e.gear.length) return `${e.area} · Your own`;
  const gear = e.gear.filter((g) => g !== 'Other').join(', ');
  return gear ? `${e.area} · ${gear}` : e.area;
}

function Thumbnail({ entry }: { entry: GuideEntry }) {
  const [failed, setFailed] = useState(false);
  if (!entry.drawn || failed) {
    return (
      <span className="flex size-12 items-center justify-center rounded-lg bg-muted/60">
        <Dumbbell size={18} aria-hidden />
      </span>
    );
  }
  return <img src={`/exercises/${entry.id}-t.webp`} alt="" width={48} height={48} loading="lazy" decoding="async" onError={() => setFailed(true)} className="ink size-12" />;
}

/** The two positions in turn, lined up so only the body moves. Paused, they sit side by side to compare. */
function Drawings({ entry, children }: { entry: GuideEntry; children: ReactNode }) {
  const [still, setStill] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <>
        <p className="rounded-xl bg-muted/60 p-4 text-center text-sm text-muted-foreground">This drawing isn&apos;t saved on this phone yet. Open it once with a connection.</p>
        {children}
      </>
    );
  }
  return (
    <>
      <div className={cx('flipbook mx-auto max-w-xs', still && 'flipbook-still')}>
        {[1, 2].map((n) => (
          <img key={n} src={`/exercises/${entry.id}-${n}.webp`} alt={`${entry.name}, ${n === 1 ? 'first' : 'second'} position`} width={320} height={320} onError={() => setFailed(true)} className="ink h-auto w-full" />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        {children}
        <span className="shrink-0 motion-reduce:hidden">
          <IconButton label={still ? 'Play the movement' : 'Pause and show both positions'} onClick={() => setStill(!still)}>
            {still ? <Play size={18} /> : <Pause size={18} />}
          </IconButton>
        </span>
      </div>
    </>
  );
}

function ExerciseSheet({ entry, onClose }: { entry: GuideEntry | undefined; onClose: () => void }) {
  const { online } = useData();
  const works = entry && (
    <p className="text-sm text-muted-foreground">
      <span className="font-medium text-foreground">Works:</span> {entry.muscles.join(' · ')}
    </p>
  );
  return (
    <Sheet open={Boolean(entry)} onClose={onClose} title={entry?.name ?? ''}>
      {entry && (
        <>
          {entry.drawn ? (
            <Drawings key={entry.id} entry={entry}>
              {works}
            </Drawings>
          ) : (
            works
          )}
          <ol className="mt-2 list-decimal space-y-1.5 pl-5">
            {entry.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {entry.note && <p className="mt-3 text-sm text-muted-foreground">{entry.note}</p>}
          <div className="mt-4 space-y-2">
            <ButtonLink href={logHref(entry)} size="lg" block>
              Log this exercise
            </ButtonLink>
            {online && (
              <ButtonLink href={videoUrl(entry.name)} target="_blank" rel="noreferrer" variant="secondary" size="lg" block>
                <ExternalLink size={16} aria-hidden className="mr-2" /> Watch a video
              </ButtonLink>
            )}
          </div>
          {entry.drawn && (
            <p className="mt-3 text-xs text-muted-foreground">
              Drawing and steps adapted from{' '}
              <a href="https://github.com/everkinetic/data" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                Everkinetic
              </a>
              ,{' '}
              <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                CC BY-SA 4.0
              </a>
              .
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}

function GuideScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const custom = useCustomExercises();
  const actions = useActions();
  const { online } = useData();
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('All');
  const [gear, setGear] = useState('Any');
  const [adding, setAdding] = useState(false);
  const [category, setCategory] = useState('Other');
  // Opened by a tap here, Back or Close returns to the list; opened from a link, there is nothing to go back to.
  const openedHere = useRef(false);

  const everything = useMemo<GuideEntry[]>(
    () => [...(custom ?? []).map((e) => ({ id: e.id, name: e.name, area: e.category, gear: [], muscles: [e.category], steps: ['Your own exercise, so no how-to yet.'], drawn: false, common: true })), ...GUIDE],
    [custom],
  );
  const found = useMemo(() => searchGuide(everything, { query, area: area === 'All' ? null : area, gear: gear === 'Any' ? null : gear }), [everything, query, area, gear]);

  if (!custom) return <ScreenSkeleton />;

  const typed = query.trim();
  const exact = everything.some((e) => e.name.toLowerCase() === typed.toLowerCase());
  const opened = everything.find((e) => e.id === params.get('e'));

  function open(id: string) {
    openedHere.current = true;
    window.history.pushState(null, '', `?e=${encodeURIComponent(id)}`);
  }

  function close() {
    // Back already took the exercise out of the address; the dialog closing after it must not go back twice.
    if (!new URLSearchParams(window.location.search).has('e')) return;
    if (openedHere.current) window.history.back();
    else window.history.replaceState(null, '', window.location.pathname);
    openedHere.current = false;
  }

  function clear() {
    setQuery('');
    setArea('All');
    setGear('Any');
  }

  async function addMine() {
    const row = await actions.addExercise(typed, category);
    router.push(logHref(row));
  }

  return (
    <>
      <BackLink href="/log">Log</BackLink>
      <PageHeader title="Exercises" />

      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search exercises</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input type="search" className={cx(inputClass, 'pl-9')} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Biceps, squat…" autoComplete="off" enterKeyHint="search" />
        </label>
        <div className="w-[10.5rem] shrink-0">
          <Select label="Equipment" hideLabel value={gear} onChange={setGear} options={[{ value: 'Any', label: 'Any equipment' }, ...GEAR.map((g) => ({ value: g, label: g }))]} />
        </div>
      </div>

      <div className="mt-2">
        <Chips label="Body part" options={['All', ...AREAS].map((a) => ({ value: a, label: a }))} value={area} onChange={setArea} />
      </div>

      <p className="tabular mb-2 mt-3 text-sm text-muted-foreground" role="status">
        {found.length.toLocaleString()} {found.length === 1 ? 'exercise' : 'exercises'}
      </p>

      {found.length > 0 ? (
        <List className="lg:grid lg:grid-cols-2 lg:divide-y-0">
          {found.map((e) => (
            <Row key={e.id} icon={<Thumbnail entry={e} />} label={e.name} detail={detailOf(e)} onClick={() => open(e.id)} />
          ))}
        </List>
      ) : (
        <Empty
          title="No exercise matches"
          action={
            <Button variant="secondary" onClick={clear}>
              Clear search and filters
            </Button>
          }
        >
          Try another word, or a body part like arms or legs.
        </Empty>
      )}

      {typed && !exact && (
        <div className="mt-3 flex flex-col gap-2">
          {found.length === 0 && online && (
            <ButtonLink href={videoUrl(typed)} target="_blank" rel="noreferrer" variant="secondary" block>
              <ExternalLink size={16} aria-hidden className="mr-2" /> Watch a video of {typed}
            </ButtonLink>
          )}
          {adding ? (
            <div className="space-y-3 rounded-xl bg-muted/60 p-3">
              <p className="text-sm">
                New exercise: <strong>{typed}</strong>
              </p>
              <Select label="Body part" value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
              <Button block onClick={addMine}>
                Add exercise
              </Button>
            </div>
          ) : (
            <Button variant="ghost" block onClick={() => setAdding(true)}>
              Add {typed} as your own
            </Button>
          )}
        </div>
      )}

      <ExerciseSheet entry={opened} onClose={close} />
    </>
  );
}

export default function GuidePage() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <GuideScreen />
    </Suspense>
  );
}
