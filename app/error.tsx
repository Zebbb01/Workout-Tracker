'use client';

import { CrashNotice } from '@/components/ui';

/** Crashes outside the signed-in app: welcome, setup, privacy. */
export default function RootError(props: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
      <CrashNotice {...props} />
    </main>
  );
}
