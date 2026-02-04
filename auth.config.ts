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

            if (isOnLogin) {
                if (isLoggedIn) return Response.redirect(new URL('/', nextUrl));
                return true;
            }

            if (!isLoggedIn) {
                return false; // Redirect to login
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
