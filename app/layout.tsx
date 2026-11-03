import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { DataProvider } from '@/lib/data';
import { RegisterServiceWorker } from '@/components/InstallApp';

// One variable family: the width axis gives the condensed cut used for titles and numbers.
const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo', display: 'swap' });

// Icons come from app/icon.svg and app/apple-icon.png; the manifest from app/manifest.ts.
export const metadata: Metadata = {
  title: { default: 'Body Tracker', template: '%s · Body Tracker' },
  description: 'Log workouts, meals and weight in a few taps, even offline.',
  appleWebApp: { capable: true, title: 'Body Tracker', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8F7F5' },
    { media: '(prefers-color-scheme: dark)', color: '#0E0C0B' },
  ],
  viewportFit: 'cover',
};

// Applies a theme chosen in More before the first paint, so there is no flash.
const theme = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: theme }} />
      </head>
      <body className="min-h-dvh font-sans">
        <DataProvider>{children}</DataProvider>
        <RegisterServiceWorker />
        <Analytics />
      </body>
    </html>
  );
}
