export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Onboarding has its own minimal layout without CacheProvider or Navigation
    // This prevents auth-required server actions from running
    return children;
}
