import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Keeps the Supabase session fresh and sends people to the right door:
 * signed out to /welcome, signed in away from it. Pages opened offline come
 * from the service worker and never reach here; the app shell checks again.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  // Supabase unreachable or a broken token: let the page load and decide.
  if (error) return response;

  const signedIn = Boolean(data?.claims);
  const onWelcome = request.nextUrl.pathname === '/welcome';
  if (signedIn !== onWelcome) return response;

  const url = request.nextUrl.clone();
  url.pathname = signedIn ? '/' : '/welcome';
  url.search = '';
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  // Skips API routes, the sign-in callback, Next's own files, and every path
  // with a file extension: the manifest, sw.js, offline.html and the icons
  // must load signed out, and a redirect breaks installing and updating.
  matcher: ['/((?!api/|auth/|_next/static|_next/image|.*\\.[a-z0-9]+$).*)'],
};
