// Meal estimates from Google's Gemini API (free tier). The person always sees
// and can correct the numbers before a meal is saved; this only fills the form.
import { z } from 'zod';

// GitHub Models, the old provider, was retired on 2026-07-30.
export const MODEL = 'gemini-3.5-flash-lite';
export const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // the phone sends about 0.2 MB; Vercel refuses bodies over 4.5 MB
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const INSTRUCTIONS = `You estimate the nutrition of one meal for a food diary.
Use typical portion sizes when the amount is not clear, and standard food composition data.
Return a short name for the meal, total calories (kcal) and total protein, carbs and fat in grams.
If there is no food to estimate, return an empty name and zeros.`;

const number = (max: number, digits: number) =>
  z.coerce
    .number()
    .refine(Number.isFinite)
    .transform((n) => Math.min(max, Math.max(0, Math.round(n * 10 ** digits) / 10 ** digits)));

/** What the API hands the meal form. Limits match supabase/migrations, so a saved estimate always syncs. */
export const Estimate = z.object({
  name: z.string().trim().transform((s) => s.slice(0, 120)),
  calories: number(10000, 0),
  protein_g: number(1000, 1),
  carbs_g: number(1500, 1),
  fat_g: number(500, 1),
});
export type Estimate = z.infer<typeof Estimate>;

export type EstimateInput = { text: string } | { image: { mimeType: string; base64: string } };

export function geminiRequest(input: EstimateInput) {
  const parts =
    'text' in input
      ? [{ text: `Meal: ${input.text}` }]
      : [{ text: 'Estimate the meal in this photo.' }, { inlineData: { mimeType: input.image.mimeType, data: input.image.base64 } }];
  return {
    systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          calories: { type: 'NUMBER' },
          protein_g: { type: 'NUMBER' },
          carbs_g: { type: 'NUMBER' },
          fat_g: { type: 'NUMBER' },
        },
        required: ['name', 'calories', 'protein_g', 'carbs_g', 'fat_g'],
      },
    },
  };
}

/** The estimate inside a generateContent response, or null when there is no usable one. */
export function readEstimate(response: unknown): Estimate | null {
  const text = (response as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('');
  if (!text) return null;
  let json: unknown;
  try {
    json = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    return null;
  }
  const parsed = Estimate.safeParse(json);
  if (!parsed.success || !parsed.data.name || parsed.data.calories === 0) return null;
  return parsed.data;
}
