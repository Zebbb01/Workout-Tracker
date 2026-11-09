import { describe, expect, it } from 'vitest';
import { geminiRequest, readEstimate, withRetry } from './nutrition';

/** A stand-in for fetch that plays back replies in order; `null` is a dropped connection. */
function replies(...statuses: (number | null)[]) {
  const calls = { count: 0, waits: [] as number[] };
  const attempt = async () => {
    const status = statuses[calls.count++];
    if (status === null) throw new TypeError('network');
    return new Response(null, { status });
  };
  const wait = async (ms: number) => void calls.waits.push(ms);
  return { calls, attempt, wait };
}

describe('withRetry', () => {
  it('returns a good reply without waiting', async () => {
    const { calls, attempt, wait } = replies(200);
    expect((await withRetry(attempt, wait))?.status).toBe(200);
    expect(calls).toEqual({ count: 1, waits: [] });
  });

  it('tries again after a 503 and uses the reply that worked', async () => {
    const { calls, attempt, wait } = replies(503, 200);
    expect((await withRetry(attempt, wait))?.status).toBe(200);
    expect(calls).toEqual({ count: 2, waits: [500] });
  });

  it('tries again after a rate limit and a dropped connection, waiting longer each time', async () => {
    const { calls, attempt, wait } = replies(429, null, 200);
    expect((await withRetry(attempt, wait))?.status).toBe(200);
    expect(calls).toEqual({ count: 3, waits: [500, 1500] });
  });

  it('does not repeat a request the provider rejected', async () => {
    const { calls, attempt, wait } = replies(400);
    expect((await withRetry(attempt, wait))?.status).toBe(400);
    expect(calls.count).toBe(1);
  });

  it('gives up after three tries and returns the last reply', async () => {
    const { calls, attempt, wait } = replies(503, 503, 502);
    expect((await withRetry(attempt, wait))?.status).toBe(502);
    expect(calls).toEqual({ count: 3, waits: [500, 1500] });
  });

  it('returns null when no try got a reply at all', async () => {
    const { attempt, wait } = replies(null, null, null);
    expect(await withRetry(attempt, wait)).toBeNull();
  });
});


const reply = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });

describe('geminiRequest', () => {
  it('sends a description as text', () => {
    const body = geminiRequest({ text: '2 eggs and toast' });
    expect(body.contents[0].parts).toEqual([{ text: 'Meal: 2 eggs and toast' }]);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('sends a photo inline with its type', () => {
    const body = geminiRequest({ image: { mimeType: 'image/jpeg', base64: 'AAAA' } });
    expect(body.contents[0].parts[1]).toEqual({ inlineData: { mimeType: 'image/jpeg', data: 'AAAA' } });
  });
});

describe('readEstimate', () => {
  it('reads and rounds a JSON reply', () => {
    expect(readEstimate(reply('{"name":"Chicken rice","calories":612.4,"protein_g":38.26,"carbs_g":70,"fat_g":"14.04"}'))).toEqual({
      name: 'Chicken rice', calories: 612, protein_g: 38.3, carbs_g: 70, fat_g: 14,
    });
  });

  it('accepts a reply wrapped in a code fence', () => {
    expect(readEstimate(reply('```json\n{"name":"Apple","calories":95,"protein_g":0.5,"carbs_g":25,"fat_g":0.3}\n```'))?.name).toBe('Apple');
  });

  it('clamps numbers to what the database accepts', () => {
    const e = readEstimate(reply('{"name":"Feast","calories":99999,"protein_g":-4,"carbs_g":3000,"fat_g":12}'));
    expect(e).toMatchObject({ calories: 10000, protein_g: 0, carbs_g: 1500 });
  });

  it('returns null for no food, broken JSON or an empty reply', () => {
    expect(readEstimate(reply('{"name":"","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}'))).toBeNull();
    expect(readEstimate(reply('not json'))).toBeNull();
    expect(readEstimate(reply('{"name":"Soup"}'))).toBeNull();
    expect(readEstimate({})).toBeNull();
    expect(readEstimate(null)).toBeNull();
  });
});
