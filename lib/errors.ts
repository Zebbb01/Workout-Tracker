// Turns failures into one plain sentence. The raw text goes to the console, never on screen.

const AUTH_MESSAGES = {
  busy: 'Too many new tries from this network. Wait a few minutes, or continue with Google.',
  taken: 'That Google account already has Body Tracker data. Sign out, then choose Continue with Google to use it.',
  off: 'Saving with Google is not switched on for this app yet.',
  cancelled: "Sign-in was cancelled. Try again when you're ready.",
  offline: "Couldn't reach the sign-in service. Check your connection, then try again.",
  failed: "Sign-in didn't work. Try again in a minute.",
};

export type AuthProblem = keyof typeof AUTH_MESSAGES;

/** Sorts whatever Supabase or Google reported into a problem this app can explain. */
export function authProblem(raw: string | null | undefined): AuthProblem {
  const text = raw ?? '';
  if (Object.hasOwn(AUTH_MESSAGES, text)) return text as AuthProblem;
  if (/rate limit|too many/i.test(text)) return 'busy';
  if (/manual linking/i.test(text)) return 'off';
  if (/already|exists|linked/i.test(text)) return 'taken';
  if (/denied|cancel/i.test(text)) return 'cancelled';
  if (/fetch|network|load failed|timed? ?out/i.test(text)) return 'offline';
  return 'failed';
}

/** Always one of the sentences above, so nothing from a provider or the address bar reaches the page. */
export const authMessage = (raw: string | null | undefined) => AUTH_MESSAGES[authProblem(raw)];

export const ESTIMATE_UNREACHABLE = "Couldn't reach the estimate service. Try again, or enter the numbers yourself.";
const ESTIMATE_FAILED = "The estimate didn't work. Try again, or enter the numbers yourself.";

/** /api/nutrition writes its own sentences; a gateway's HTML or a provider's JSON never reaches the screen. */
export function estimateProblem(reply: unknown): string {
  const error = (reply as { error?: unknown } | null)?.error;
  return typeof error === 'string' ? error : ESTIMATE_FAILED;
}
