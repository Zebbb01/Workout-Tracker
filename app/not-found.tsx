import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
      <h1 className="font-display text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">That link is old or mistyped. What you&apos;ve logged is safe.</p>
      <ButtonLink href="/" className="mt-5 self-start">
        Back to Today
      </ButtonLink>
    </main>
  );
}
