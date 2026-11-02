'use client';

import { Suspense, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { LogOut, ShieldCheck } from 'lucide-react';
import { account, useActions, useData, useProfile, useWeights } from '@/lib/data';
import { computeTargets, weightSeries } from '@/lib/calc';
import type { Units } from '@/lib/types';
import { Button, Card, Field, Loading, NumberInput, PageHeader, Segmented, Sheet, useToast } from '@/components/ui';
import InstallApp, { useInstall } from '@/components/InstallApp';
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
  const [confirm, setConfirm] = useState<'signout' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(authError ? explain(authError) : null);

  if (!profile || !weights || !user) return <Loading />;

  const anonymous = Boolean(user.is_anonymous);
  const current = targets ?? {
    calories: String(profile.calories ?? ''),
    protein_g: String(profile.protein_g ?? ''),
    carbs_g: String(profile.carbs_g ?? ''),
    fat_g: String(profile.fat_g ?? ''),
  };

  async function saveWithGoogle() {
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
    toast({ message: 'Daily targets saved' });
  }

  return (
    <>
      <PageHeader title="More" />

      <div className="space-y-4">
        <Card aria-labelledby="account-title">
          <h2 id="account-title" className="font-semibold">Account</h2>
          {anonymous ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                You&apos;re trying Body Tracker without an account. Entries are kept for 30 days on this device. Save them with Google to keep them and use them on other devices.
              </p>
              <Button className="mt-3" block onClick={saveWithGoogle} busy={busy} disabled={!online}>
                <ShieldCheck size={18} aria-hidden /> Save my data with Google
              </Button>
            </>
          ) : (
            <p className="mt-1 text-sm">
              Signed in with Google as <strong>{user.email}</strong>
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-negative">
              {error}
            </p>
          )}
          <Button className="mt-3" block variant="secondary" onClick={() => setConfirm('signout')}>
            <LogOut size={18} aria-hidden /> Sign out
          </Button>
        </Card>

        {install && (
          <Card aria-labelledby="install-title">
            <h2 id="install-title" className="mb-2 font-semibold">Install the app</h2>
            <InstallApp />
          </Card>
        )}

        <Card aria-labelledby="settings-title" className="space-y-4">
          <h2 id="settings-title" className="font-semibold">Settings</h2>
          <Segmented<Units>
            label="Units"
            value={profile.units}
            onChange={(units) => actions.saveProfile({ units })}
            options={[{ value: 'metric', label: 'kg' }, { value: 'imperial', label: 'lb' }]}
          />
          <Segmented<Theme>
            label="Theme"
            value={theme}
            onChange={setTheme}
            options={[{ value: 'system', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
          />
        </Card>

        <Card aria-labelledby="targets-title">
          <h2 id="targets-title" className="font-semibold">Daily targets</h2>
          <form
            className="mt-3 space-y-3"
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
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={!targets}>
                Save targets
              </Button>
              <Button variant="secondary" onClick={recalculate}>
                Recalculate from my latest weight
              </Button>
            </div>
          </form>
        </Card>

        <Card aria-labelledby="about-title">
          <h2 id="about-title" className="font-semibold">About</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Body Tracker {pkg.version}. Entries are saved on this device first and synced to your account. Meal photos are sent to Google&apos;s Gemini only to estimate nutrition and are not stored.
          </p>
          <a href="https://github.com/Zebbb01/Workout-Tracker" className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-accent underline-offset-4 hover:underline">
            Source code on GitHub
          </a>
        </Card>

        <Card aria-labelledby="danger-title">
          <h2 id="danger-title" className="font-semibold">Delete account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Removes your account and everything you&apos;ve logged, on every device.</p>
          <Button className="mt-3" variant="danger" onClick={() => setConfirm('delete')} disabled={!online}>
            Delete my account
          </Button>
        </Card>
      </div>

      <Sheet open={confirm === 'signout'} onClose={() => setConfirm(null)} title="Sign out?">
        <p className="text-muted-foreground">
          {anonymous
            ? "You haven't saved your data with Google, so signing out deletes what you've logged. Save it first to keep it."
            : 'Your entries stay in your account. This device forgets them until you sign in again.'}
        </p>
        <div className="mt-4 flex gap-3">
          <Button variant="secondary" block onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button variant={anonymous ? 'danger' : 'primary'} block onClick={() => account.signOut(db)}>
            Sign out
          </Button>
        </div>
      </Sheet>

      <Sheet open={confirm === 'delete'} onClose={() => setConfirm(null)} title="Delete your account?">
        <p className="text-muted-foreground">This removes your account and every workout, meal and weight you&apos;ve logged. It can&apos;t be undone.</p>
        <div className="mt-4 flex gap-3">
          <Button variant="secondary" block onClick={() => setConfirm(null)}>
            Keep my account
          </Button>
          <Button
            variant="danger"
            block
            busy={busy}
            onClick={async () => {
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
            Delete everything
          </Button>
        </div>
      </Sheet>
    </>
  );
}

export default function MorePage() {
  return (
    <Suspense fallback={<Loading />}>
      <MoreScreen />
    </Suspense>
  );
}
