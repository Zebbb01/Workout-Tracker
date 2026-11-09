'use client';

import { CrashNotice } from '@/components/ui';

/** A crashed screen inside the app. It sits below the layout, so the tabs stay and there is a way out. */
export default function AppError(props: { error: unknown; retry: () => void }) {
  return <CrashNotice {...props} />;
}
