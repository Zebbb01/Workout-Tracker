import type { Metadata } from 'next';
import { BackLink } from '@/components/ui';

export const metadata: Metadata = { title: 'Privacy' };

// Public for everyone, signed in or not (proxy.ts skips it): Google links to it from the sign-in screen.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
      <BackLink href="/">Body Tracker</BackLink>
      <h1 className="font-display mt-3 text-3xl font-bold">Privacy</h1>
      <p className="mt-1 text-sm text-muted-foreground">Updated 9 November 2026</p>

      <Part title="What is stored">
        <p>
          What you log (sets, meals, weight, fasts and your daily targets) is saved on your device and in the app&apos;s
          database on Supabase, in the EU. Every row belongs to your account, and the database refuses any other account
          access to it.
        </p>
        <p>
          &ldquo;Try it without an account&rdquo; needs no name or email. If you save your data with Google, the app receives
          your name, email address and profile picture from Google, and nothing else.
        </p>
      </Part>

      <Part title="Meal photos and descriptions">
        <p>
          When you ask for an estimate, the photo or text is sent to Google&apos;s Gemini API, which returns the nutrition
          numbers. Body Tracker does not keep the photo. The app uses Gemini&apos;s free tier, under which Google may use what
          is sent to improve its products, so don&apos;t photograph anything private.
        </p>
      </Part>

      <Part title="Analytics">
        <p>Vercel Web Analytics counts page visits without cookies and without identifying you.</p>
      </Part>

      <Part title="Keeping and deleting">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Delete account, in More, removes your account and everything you logged, on every device.</li>
          <li>
            Try-it accounts are deleted 30 days after they are created, with everything logged in them, unless you saved
            them with Google.
          </li>
          <li>Nothing is sold or shared for advertising.</li>
        </ul>
      </Part>

      <Part title="Terms" id="terms">
        <p>
          Body Tracker is a free portfolio project, provided as is, without warranty. Calorie and macro estimates are
          approximations, not medical or nutrition advice.
        </p>
      </Part>

      <Part title="Credits">
        <p>
          Exercise drawings and many of the step-by-step instructions are adapted from{' '}
          <a href="https://github.com/everkinetic/data" className="font-medium text-accent underline underline-offset-4">
            Everkinetic
          </a>{' '}
          by Greg Priday, under{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="font-medium text-accent underline underline-offset-4">
            CC BY-SA 4.0
          </a>
          . The drawings were cropped and lined up, and the instructions shortened. &ldquo;Watch a video&rdquo; opens a YouTube search.
        </p>
      </Part>

      <Part title="Contact">
        <p>
          Questions or requests:{' '}
          <a href="https://github.com/Zebbb01/Workout-Tracker/issues" className="font-medium text-accent underline underline-offset-4">
            open an issue on GitHub
          </a>
          .
        </p>
      </Part>
    </main>
  );
}

function Part({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-6 border-t border-border pt-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}
