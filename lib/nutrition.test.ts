import { describe, expect, it } from 'vitest';
import { geminiRequest, readEstimate } from './nutrition';

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
