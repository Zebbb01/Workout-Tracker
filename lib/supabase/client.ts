import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

/**
 * The browser's Supabase client. The session lives in cookies, so the proxy
 * and API routes see the same sign-in. The publishable key is public by
 * design: Row Level Security is what protects the data.
 */
export function supabase(): SupabaseClient {
  client ??= createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  return client;
}
