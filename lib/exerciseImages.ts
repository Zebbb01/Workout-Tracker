// Maps exercise categories to curated exercise images
// Images: Unsplash free-to-use URLs (no key required for direct hotlinking)
// Format: { category_key: image_url }

export const CATEGORY_IMAGES: Record<string, string> = {
    chest: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&auto=format&fit=crop&q=70',
    back: 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=400&auto=format&fit=crop&q=70',
    legs: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&auto=format&fit=crop&q=70',
    shoulders: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&auto=format&fit=crop&q=70',
    arms: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&auto=format&fit=crop&q=70',
    biceps: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&auto=format&fit=crop&q=70',
    triceps: 'https://images.unsplash.com/photo-1597452485595-da0e4e3a3050?w=400&auto=format&fit=crop&q=70',
    abs: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&auto=format&fit=crop&q=70',
    core: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&auto=format&fit=crop&q=70',
    cardio: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=400&auto=format&fit=crop&q=70',
    glutes: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&auto=format&fit=crop&q=70',
    calves: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&auto=format&fit=crop&q=70',
    other: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&auto=format&fit=crop&q=70',
    full_body: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&auto=format&fit=crop&q=70',
};

export function getExerciseImage(category: string): string {
    const key = category.toLowerCase().replace(/[\s-]/g, '_').replace('/', '_');
    return CATEGORY_IMAGES[key] ?? CATEGORY_IMAGES.other;
}

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
