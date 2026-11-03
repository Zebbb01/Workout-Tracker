import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Supabase as the signed-in person, for route handlers. */
export async function serverSupabase() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        list.forEach(({ name, value, options }) => store.set(name, value, options));
      },
    },
  });
}
