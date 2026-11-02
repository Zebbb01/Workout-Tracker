import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Providers from './providers';
import { Analytics } from '@vercel/analytics/next';
import { RegisterServiceWorker } from '@/components/InstallApp';

const inter = Inter({ subsets: ['latin'] });

// Icons come from app/icon.svg and app/apple-icon.png; the manifest from app/manifest.ts.
export const metadata: Metadata = {
    title: 'Body Tracker',
    description: 'Log workouts, meals and weight in a few taps, even offline.',
    appleWebApp: { capable: true, title: 'Body Tracker', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
    themeColor: '#0C0A09',
    viewportFit: 'cover',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-background text-foreground min-h-screen flex flex-col items-center`}>
                <Providers>
                    <Sidebar />
                    <main className="w-full max-w-md px-4 pt-4 pb-8 flex-1">
                        {children}
                    </main>
                </Providers>
                <RegisterServiceWorker />
                <Analytics />
            </body>
        </html>
    );
}
