import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/supabase/server';
import { ENDPOINT, IMAGE_TYPES, MAX_IMAGE_BYTES, geminiRequest, readEstimate, withRetry, type EstimateInput } from '@/lib/nutrition';

// Three tries of up to 12 seconds, plus the waits between them.
export const maxDuration = 45;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Estimates a meal from a photo (multipart, field "image") or a description
 * (JSON {"text"}). Only fills the form: the person checks the numbers and
 * saves. Photos are passed to Gemini and never stored or logged here.
 */
export async function POST(request: Request) {
  const supabase = await serverSupabase();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return fail(401, 'Sign in to get estimates.');

  let input: EstimateInput;
  if ((request.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
    const image = (await request.formData().catch(() => null))?.get('image');
    if (!(image instanceof File) || !IMAGE_TYPES.includes(image.type)) return fail(400, 'Send a JPEG, PNG or WebP photo.');
    if (image.size > MAX_IMAGE_BYTES) return fail(413, 'That photo is too large. Try another one.');
    input = { image: { mimeType: image.type, base64: Buffer.from(await image.arrayBuffer()).toString('base64') } };
  } else {
    const body = await request.json().catch(() => null);
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!text || text.length > 300) return fail(400, 'Describe the meal in a few words.');
    input = { text };
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return fail(503, 'Estimates are not set up yet. Enter the numbers yourself for now.');

  const { data: allowed, error } = await supabase.rpc('use_ai_estimate');
  if (error) return fail(500, 'Something went wrong. Enter the numbers yourself for now.');
  if (!allowed) return fail(429, "You've used today's estimates. Enter the numbers yourself, or try again tomorrow.");

  const payload = JSON.stringify(geminiRequest(input));
  const response = await withRetry(() =>
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: payload,
      signal: AbortSignal.timeout(12_000),
    }),
  );
  if (!response?.ok) {
    console.error('Gemini estimate failed:', response?.status ?? 'no reply', (await response?.text().catch(() => ''))?.slice(0, 300));
    return fail(502, 'The estimate service is busy. Try again in a minute, or enter the numbers yourself.');
  }

  const estimate = readEstimate(await response.json().catch(() => null));
  if (!estimate) return fail(422, "Couldn't find a meal to estimate. Try another photo, or describe it.");
  return NextResponse.json(estimate);
}
