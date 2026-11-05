'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Dumbbell, TrendingUp, WifiOff } from 'lucide-react';
import { account } from '@/lib/data';
import { Button } from '@/components/ui';
import InstallApp from '@/components/InstallApp';

const POINTS = [
  { icon: Dumbbell, text: 'Log a set in two taps' },
  { icon: Camera, text: 'Snap a meal, check the numbers' },
  { icon: TrendingUp, text: 'Watch your weight and lifts trend' },
  { icon: WifiOff, text: 'Works with no signal at the gym' },
];

function Welcome() {
  const router = useRouter();
  const authError = useSearchParams().get('auth_error');
  const [busy, setBusy] = useState<'try' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(authError);

  async function tryIt() {
    setBusy('try');
    setError(null);
    const { error } = await account.tryWithoutAccount();
    if (error) {
      setError(error.message.includes('rate limit') ? 'Too many new tries from this network. Wait a few minutes, or continue with Google.' : error.message);
      setBusy(null);
      return;
    }
    router.replace('/onboarding');
  }

  async function google() {
    setBusy('google');
    setError(null);
    const { error } = await account.signInWithGoogle();
    if (error) {
      setError(error.message);
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
      <img src="/icon-192.png" alt="" width={52} height={52} className="rounded-xl" />
      <h1 className="font-display mt-5 text-4xl font-bold">Body Tracker</h1>
      <p className="mt-1 text-lg text-muted-foreground">Workouts, meals and weight in a few taps.</p>

      <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
        {POINTS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-2">
            <Icon size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 space-y-2.5">
        <Button size="lg" block onClick={tryIt} busy={busy === 'try'} disabled={busy !== null}>
          Try it without an account
        </Button>
        <Button size="lg" block variant="outline" onClick={google} busy={busy === 'google'} disabled={busy !== null}>
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
          </svg>
          Continue with Google
        </Button>
        {error && (
          <p role="alert" className="text-sm text-negative">
            {error}
          </p>
        )}
        <p className="pt-1 text-center text-xs text-muted-foreground">
          No email needed. Save with Google any time to keep your entries.{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy
          </Link>
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <InstallApp />
      </div>
    </main>
  );
}

export default function WelcomePage() {
  return (
    <Suspense>
      <Welcome />
    </Suspense>
  );
}
