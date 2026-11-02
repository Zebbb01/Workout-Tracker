'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData, useProfile } from '@/lib/data';
import { Nav, OfflineBanner } from '@/components/Shell';
import { Loading, ToastProvider } from '@/components/ui';

/**
 * The signed-in app. The proxy already sent signed-out visitors to /welcome
 * when online; this repeats the check for pages the service worker serves
 * offline, and sends new people through onboarding once their data has had
 * one chance to arrive from another device.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { ready, user, firstSyncDone } = useData();
  const profile = useProfile();
  const needsOnboarding = firstSyncDone && profile !== undefined && !profile?.onboarded_at;

  useEffect(() => {
    if (ready && !user) router.replace('/welcome');
    else if (needsOnboarding) router.replace('/onboarding');
  }, [ready, user, needsOnboarding, router]);

  return (
    <ToastProvider>
      <Nav />
      <div className="lg:pl-60">
        <main className="mx-auto w-full max-w-lg px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 lg:max-w-3xl lg:px-8 lg:pb-10 lg:pt-8">
          <OfflineBanner />
          {ready && user ? children : <Loading />}
        </main>
      </div>
    </ToastProvider>
  );
}
