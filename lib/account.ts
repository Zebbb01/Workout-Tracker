// Signing in and out. Its own module so the welcome page can load it on the first tap
// instead of making every visitor download the Supabase client up front.
import { authMessage } from './errors';
import { supabase } from './supabase/client';
import type { LocalDB } from './db';

const callback = (next: string) => `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

/** Every sign-in call answers with a sentence for the screen, or null. */
async function explained(call: PromiseLike<{ error: { message: string } | null }>) {
  try {
    const { error } = await call;
    if (error) console.error('Sign-in failed:', error.message);
    return { error: error ? authMessage(error.message) : null };
  } catch (error) {
    console.error('Sign-in failed:', error);
    return { error: authMessage(String(error)) };
  }
}

export const account = {
  tryWithoutAccount: () => explained(supabase().auth.signInAnonymously()),
  signInWithGoogle: () => explained(supabase().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callback('/') } })),
  /** Turns a "try it" account into a Google one. Same user id, so every entry stays. */
  saveWithGoogle: () => explained(supabase().auth.linkIdentity({ provider: 'google', options: { redirectTo: callback('/more') } })),
  async signOut(db: LocalDB | null) {
    await supabase().auth.signOut();
    await db?.delete();
    // A full load, so nothing of this session stays in memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    location.assign('/welcome');
  },
  async deleteAccount(db: LocalDB | null) {
    const { error } = await supabase().rpc('delete_my_account');
    if (error) throw error;
    await account.signOut(db);
  },
};
