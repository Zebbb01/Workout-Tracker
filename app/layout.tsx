import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { DataProvider } from '@/lib/data';
import { RegisterServiceWorker } from '@/components/InstallApp';

const inter = Inter({ subsets: ['latin'] });

// Icons come from app/icon.svg and app/apple-icon.png; the manifest from app/manifest.ts.
export const metadata: Metadata = {
  title: { default: 'Body Tracker', template: '%s · Body Tracker' },
  description: 'Log workouts, meals and weight in a few taps, even offline.',
  appleWebApp: { capable: true, title: 'Body Tracker', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF9' },
    { media: '(prefers-color-scheme: dark)', color: '#0C0A09' },
  ],
  viewportFit: 'cover',
};

// Applies a theme chosen in More before the first paint, so there is no flash.
const theme = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: theme }} />
      </head>
      <body className={`${inter.className} min-h-dvh`}>
        <DataProvider>{children}</DataProvider>
        <RegisterServiceWorker />
        <Analytics />
      </body>
    </html>
  );
}
