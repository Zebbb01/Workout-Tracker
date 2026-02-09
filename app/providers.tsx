'use client';

import { CacheProvider } from '@/lib/cache';

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <CacheProvider>
            {children}
        </CacheProvider>
    );
}
