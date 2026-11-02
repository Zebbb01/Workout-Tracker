// Category color accent for visual variety
export const CATEGORY_COLORS: Record<string, string> = {
    chest: '#f97316',
    back: '#22c55e',
    legs: '#3b82f6',
    shoulders: '#a855f7',
    arms: '#ef4444',
    biceps: '#ef4444',
    triceps: '#f43f5e',
    abs: '#eab308',
    core: '#eab308',
    cardio: '#06b6d4',
    glutes: '#8b5cf6',
    calves: '#64748b',
    other: '#6b7280',
    full_body: '#f97316',
};

export function getCategoryColor(category: string): string {
    const key = category.toLowerCase().replace(/[\s-]/g, '_').replace('/', '_');
    return CATEGORY_COLORS[key] ?? CATEGORY_COLORS.other;
}
