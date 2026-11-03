'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData, useProfile } from '@/lib/data';
import { Nav, OfflineBanner } from '@/components/Shell';
import { ScreenSkeleton, ToastProvider } from '@/components/ui';

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
      <div className="lg:pl-56">
        <main className="mx-auto w-full max-w-lg px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 sm:max-w-2xl lg:max-w-5xl lg:px-10 lg:pb-12 lg:pt-8">
          <OfflineBanner />
          {ready && user ? children : <ScreenSkeleton />}
        </main>
      </div>
    </ToastProvider>
  );
}
