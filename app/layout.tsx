import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Gym Tracker',
    description: 'Track your workouts and progress',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-background text-foreground min-h-screen flex flex-col items-center`}>
                <main className="w-full max-w-md px-4 pt-4 pb-24 flex-1">
                    {children}
                </main>
                <Navigation />
            </body>
        </html>
    );
}
