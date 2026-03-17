import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const GITHUB_MODELS_URL = 'https://models.inference.ai.azure.com/chat/completions';

const SYSTEM_PROMPT = `You are a precise nutrition calculator and food analyst. 
Analyze the image provided and estimate the nutritional values.
If you recognize food, return its name and nutrition info.

Rules:
- Return ONLY a valid JSON object with exactly these keys: 
  name (string), calories (integer), protein (float), carbs (float), fat (float)
- name: a short descriptive name for the food
- calories: in kcal
- protein, carbs, fat: in grams
- Be as accurate as possible.
- If multiple food items are present, sum their nutrition but return a combined name.
- Do NOT include any explanation or extra text — ONLY the JSON object.

Example output: {"name": "Chicken breast with broccoli", "calories": 350, "protein": 45.0, "carbs": 12.0, "fat": 8.0}`;

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const image = formData.get('image') as File;

        if (!image) {
            return NextResponse.json({ error: 'Image is required' }, { status: 400 });
        }

        // Convert image to base64
        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Image = buffer.toString('base64');
        const mimeType = image.type;

        const githubToken = process.env.GITHUB_TOKEN;
        if (!githubToken) {
            return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
        }

        const aiResponse = await fetch(GITHUB_MODELS_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Analyze this food photo and provide its nutritional estimation.'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.1,
                response_format: { type: "json_object" }
            }),
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error('GitHub Models Vision API error:', aiResponse.status, errorText);
            return NextResponse.json({ error: 'API Error' }, { status: 502 });
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;

        if (!content) {
            return NextResponse.json({ error: 'No response from AI' }, { status: 502 });
        }

        const nutritionData = JSON.parse(content);
        
        return NextResponse.json({
            name: nutritionData.name || 'Analyzed Meal',
            calories: Math.round(Number(nutritionData.calories) || 0),
            protein: Math.round((Number(nutritionData.protein) || 0) * 10) / 10,
            carbs: Math.round((Number(nutritionData.carbs) || 0) * 10) / 10,
            fat: Math.round((Number(nutritionData.fat) || 0) * 10) / 10
        });

    } catch (error) {
        console.error('Image scan error:', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}
