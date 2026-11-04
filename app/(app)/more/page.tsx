'use client';

import { Suspense, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Github, Info, Loader2, Lock, LogOut, RefreshCw, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { account, useActions, useData, useProfile, useWeights } from '@/lib/data';
import { computeTargets, weightSeries } from '@/lib/calc';
import type { Units } from '@/lib/types';
import { Button, ConfirmDialog, Field, List, NumberInput, PageHeader, Row, ScreenSkeleton, Section, Segmented, Sheet, useToast } from '@/components/ui';
import { installApp, useInstall } from '@/components/InstallApp';
import pkg from '@/package.json';

type Theme = 'system' | 'light' | 'dark';

function readTheme(): Theme {
  try {
    const t = localStorage.getItem('theme');
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

const themeListeners = new Set<() => void>();
function setTheme(theme: Theme) {
  try {
    if (theme === 'system') localStorage.removeItem('theme');
    else localStorage.setItem('theme', theme);
  } catch {}
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  themeListeners.forEach((notify) => notify());
}

/** Turns Supabase's linking errors into what the person can do about them. */
function explain(error: string) {
  if (/already|exists|linked/i.test(error)) return 'That Google account already has Body Tracker data. Sign out, then choose Continue with Google to use it.';
  if (/manual linking/i.test(error)) return 'Saving with Google is not switched on for this app yet.';
  return error;
}

function MoreScreen() {
  const { user, db, online } = useData();
  const profile = useProfile();
  const weights = useWeights();
  const actions = useActions();
  const toast = useToast();
  const install = useInstall();
  const authError = useSearchParams().get('auth_error');
  const theme = useSyncExternalStore((n) => (themeListeners.add(n), () => themeListeners.delete(n)), readTheme, () => 'system' as Theme);

  const [targets, setTargets] = useState<Record<'calories' | 'protein_g' | 'carbs_g' | 'fat_g', string> | null>(null);
  const [editingTargets, setEditingTargets] = useState(false);
  const [confirm, setConfirm] = useState<'signout' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(authError ? explain(authError) : null);

  if (!profile || !weights || !user) return <ScreenSkeleton />;

  const anonymous = Boolean(user.is_anonymous);
  const saved = {
    calories: String(profile.calories ?? ''),
    protein_g: String(profile.protein_g ?? ''),
    carbs_g: String(profile.carbs_g ?? ''),
    fat_g: String(profile.fat_g ?? ''),
  };
  const current = targets ?? saved;

  async function saveWithGoogle() {
    if (!online) return setError('Connect to the internet to save with Google.');
    setBusy(true);
    setError(null);
    const { error } = await account.saveWithGoogle();
    if (error) {
      setError(explain(error.message));
      setBusy(false);
    }
  }

  function recalculate() {
    const latest = weightSeries(weights ?? []).at(-1)?.kg ?? 70;
    const t = computeTargets({
      sex: profile!.sex, age: profile!.age ?? 30, heightCm: profile!.height_cm ?? 170, weightKg: latest, activity: profile!.activity, goal: profile!.goal,
    });
    setTargets({ calories: String(t.calories), protein_g: String(t.protein_g), carbs_g: String(t.carbs_g), fat_g: String(t.fat_g) });
  }

  async function saveTargets() {
    const n = (v: string, max: number) => Math.min(max, Math.max(0, Math.round(Number(v) || 0)));
    await actions.saveProfile({ calories: Math.max(800, n(current.calories, 8000)), protein_g: n(current.protein_g, 1000), carbs_g: n(current.carbs_g, 1500), fat_g: n(current.fat_g, 500) });
    setTargets(null);
    setEditingTargets(false);
    toast({ message: 'Daily targets saved' });
  }

  return (
    <>
      <PageHeader title="More" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          <Section title="Account">
            <List>
              <Row
                icon={<UserRound size={18} />}
                label={anonymous ? 'Trying without an account' : user.email}
                detail={anonymous ? 'Entries are kept for 30 days' : 'Signed in with Google'}
              />
              {anonymous && (
                <Row
                  icon={busy ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  label="Save my data with Google"
                  detail="Keep entries and use other devices"
                  tone="accent"
                  onClick={saveWithGoogle}
                />
              )}
              <Row icon={<LogOut size={18} />} label="Sign out" onClick={() => setConfirm('signout')} />
            </List>
            {error && (
              <p role="alert" className="mt-2 text-sm text-negative">
                {error}
              </p>
            )}
          </Section>

          <Section title="Preferences">
            <List>
              <Row label="Units">
                <Segmented<Units>
                  label="Units"
                  hideLabel
                  fit
                  value={profile.units}
                  onChange={(units) => actions.saveProfile({ units })}
                  options={[{ value: 'metric', label: 'kg' }, { value: 'imperial', label: 'lb' }]}
                />
              </Row>
              <Row label="Theme">
                <Segmented<Theme>
                  label="Theme"
                  hideLabel
                  fit
                  value={theme}
                  onChange={setTheme}
                  options={[{ value: 'system', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
                />
              </Row>
            </List>
          </Section>

          <Section title="Daily targets">
            <List>
              <Row
                label={<span className="tabular">{Number(saved.calories).toLocaleString()} kcal</span>}
                detail={<span className="tabular">Protein {saved.protein_g} g · Carbs {saved.carbs_g} g · Fat {saved.fat_g} g</span>}
                onClick={() => setEditingTargets(true)}
              >
                <span className="text-sm font-medium text-accent">Edit</span>
              </Row>
            </List>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="App">
            <List>
              {install === 'prompt' && <Row icon={<Download size={18} />} label="Install app" detail="Its own window, works offline" onClick={installApp} />}
              {install === 'ios' && <Row icon={<Download size={18} />} label="Add to Home Screen" detail="Tap Share, then Add to Home Screen" />}
              <Row icon={<Lock size={18} />} label="Privacy" detail="Meal photos go to Google Gemini only for estimates" />
              <Row icon={<Github size={18} />} label="Source code" detail="github.com/Zebbb01/Workout-Tracker" href="https://github.com/Zebbb01/Workout-Tracker" />
              <Row icon={<Info size={18} />} label="Version">
                <span className="tabular text-sm text-muted-foreground">{pkg.version}</span>
              </Row>
            </List>
          </Section>

          <List>
            <Row
              icon={<Trash2 size={18} />}
              label="Delete account"
              detail="Removes everything, on every device"
              tone="danger"
              onClick={() => (online ? setConfirm('delete') : setError('Connect to the internet to delete your account.'))}
            />
          </List>
        </div>
      </div>

      <Sheet open={editingTargets} onClose={() => { setEditingTargets(false); setTargets(null); }} title="Daily targets">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            saveTargets();
          }}
        >
          <Field label="Calories (kcal)">
            <NumberInput value={current.calories} onChange={(v) => setTargets({ ...current, calories: v })} inputMode="numeric" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Protein (g)">
              <NumberInput value={current.protein_g} onChange={(v) => setTargets({ ...current, protein_g: v })} inputMode="numeric" />
            </Field>
            <Field label="Carbs (g)">
              <NumberInput value={current.carbs_g} onChange={(v) => setTargets({ ...current, carbs_g: v })} inputMode="numeric" />
            </Field>
            <Field label="Fat (g)">
              <NumberInput value={current.fat_g} onChange={(v) => setTargets({ ...current, fat_g: v })} inputMode="numeric" />
            </Field>
          </div>
          <Button variant="ghost" size="sm" onClick={recalculate}>
            <RefreshCw size={15} aria-hidden /> Recalculate from my latest weight
          </Button>
          <Button type="submit" size="lg" block disabled={!targets}>
            Save targets
          </Button>
        </form>
      </Sheet>

      <ConfirmDialog
        open={confirm === 'signout'}
        title="Sign out?"
        confirmLabel="Sign out"
        tone={anonymous ? 'danger' : 'primary'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => account.signOut(db)}
      >
        {anonymous
          ? "You haven't saved with Google, so signing out deletes what you've logged."
          : 'Your entries stay in your account. This device forgets them until you sign in again.'}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === 'delete'}
        title="Delete your account?"
        confirmLabel="Delete everything"
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await account.deleteAccount(db);
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
            setConfirm(null);
          }
        }}
      >
        Every workout, meal and weight you&apos;ve logged is removed. This can&apos;t be undone.
      </ConfirmDialog>
    </>
  );
}

export default function MorePage() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <MoreScreen />
    </Suspense>
  );
}
