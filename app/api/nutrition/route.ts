import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const prisma = new PrismaClient();

const GITHUB_MODELS_URL = 'https://models.inference.ai.azure.com/chat/completions';

const SYSTEM_PROMPT = `You are a precise nutrition calculator. Given a meal description, estimate the total nutritional values as accurately as possible.

Rules:
- Return ONLY a valid JSON object with exactly these keys: calories (integer), protein (float), carbs (float), fat (float)
- calories should be in kcal
- protein, carbs, fat should be in grams
- If multiple food items are listed, SUM all their nutrition values together
- Use standard serving sizes when portions aren't specified (e.g., "eggs" = 1 large egg ~50g, "rice" = 1 cup cooked ~158g, "chicken breast" = 1 medium ~170g)
- Be as accurate as possible based on USDA food composition data
- Do NOT include any explanation, markdown, or extra text — ONLY the JSON object

Example input: "2 eggs, 1 apple"
Example output: {"calories":237,"protein":13.6,"carbs":25.1,"fat":10.0}`;

export async function POST(request: NextRequest) {
    try {
        // Verify user is authenticated
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { mealName } = await request.json();

        if (!mealName || typeof mealName !== 'string' || !mealName.trim()) {
            return NextResponse.json({ error: 'Meal name is required' }, { status: 400 });
        }

        // Normalize the query key for consistent caching
        const queryKey = mealName.toLowerCase().trim().replace(/\s+/g, ' ');

        // Check cache first
        const cached = await prisma.nutritionCache.findUnique({
            where: { queryKey },
        });

        if (cached) {
            return NextResponse.json({
                calories: cached.calories,
                protein: cached.protein,
                carbs: cached.carbs,
                fat: cached.fat,
                fromCache: true,
            });
        }

        // Call GitHub Models API (gpt-4.1-mini)
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
                model: 'openai/gpt-4.1-mini',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: queryKey },
                ],
                temperature: 0.1, // Low temperature for consistent, accurate results
            }),
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error('GitHub Models API error:', aiResponse.status, errorText);
            return NextResponse.json(
                { error: 'Failed to calculate nutrition. Please try again.' },
                { status: 502 }
            );
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;

        if (!content) {
            return NextResponse.json(
                { error: 'No response from AI model' },
                { status: 502 }
            );
        }

        // Parse the AI response - handle potential markdown code blocks
        let nutritionData;
        try {
            // Strip markdown code fences if present
            const cleaned = content
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/g, '')
                .trim();
            nutritionData = JSON.parse(cleaned);
        } catch {
            console.error('Failed to parse AI response:', content);
            return NextResponse.json(
                { error: 'Failed to parse nutrition data from AI' },
                { status: 502 }
            );
        }

        // Validate the parsed data
        const calories = Math.round(Number(nutritionData.calories) || 0);
        const protein = Math.round((Number(nutritionData.protein) || 0) * 10) / 10;
        const carbs = Math.round((Number(nutritionData.carbs) || 0) * 10) / 10;
        const fat = Math.round((Number(nutritionData.fat) || 0) * 10) / 10;

        // Save to cache for future lookups
        try {
            await prisma.nutritionCache.create({
                data: {
                    queryKey,
                    calories,
                    protein,
                    carbs,
                    fat,
                },
            });
        } catch (cacheError) {
            // If cache save fails (e.g., race condition duplicate), that's okay
            console.warn('Failed to save to nutrition cache:', cacheError);
        }

        return NextResponse.json({
            calories,
            protein,
            carbs,
            fat,
            fromCache: false,
        });
    } catch (error) {
        console.error('Nutrition calculation error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
