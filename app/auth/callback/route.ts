import { NextResponse, type NextRequest } from 'next/server';
import { serverSupabase } from '@/lib/supabase/server';
import { authProblem } from '@/lib/errors';

/**
 * Where Google sign-in and "Save your data with Google" come back to. Swaps
 * the one-time code for a session, then returns to `next`, an in-app path.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const asked = searchParams.get('next') ?? '/';
  const next = asked.startsWith('/') && !asked.startsWith('//') ? asked : '/';

  let problem = searchParams.get('error_description') ?? searchParams.get('error');
  const code = searchParams.get('code');
  if (code) {
    const { error } = await (await serverSupabase()).auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    problem = error.message;
  }
  const back = new URL(next, origin);
  // Only a short code travels in the address; the provider's own words stay in the log.
  if (problem) console.error('Sign-in failed:', problem);
  back.searchParams.set('auth_error', problem ? authProblem(problem) : 'cancelled');
  return NextResponse.redirect(back);
}
