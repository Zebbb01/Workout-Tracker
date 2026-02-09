import Google from "next-auth/providers/google"
import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
    ],
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnLogin = nextUrl.pathname.startsWith('/login');
            const isOnOnboarding = nextUrl.pathname.startsWith('/onboarding');

            // If logged in and trying to access onboarding, redirect to home
            if (isOnOnboarding && isLoggedIn) {
                return Response.redirect(new URL('/', nextUrl));
            }

            // Allow unauthenticated access to onboarding
            if (isOnOnboarding) {
                return true;
            }

            if (isOnLogin) {
                if (isLoggedIn) return Response.redirect(new URL('/', nextUrl));
                return true;
            }

            if (!isLoggedIn) {
                // Redirect to onboarding instead of login for new users
                return Response.redirect(new URL('/onboarding', nextUrl));
            }

            return true;
        },
        session: async ({ session, user, token }) => {
            if (session?.user && token?.sub) {
                session.user.id = token.sub;
            }
            return session;
        },
    },
    session: { strategy: "jwt" }, // Use JWT for easier edge compatibility and simple auth
} satisfies NextAuthConfig
