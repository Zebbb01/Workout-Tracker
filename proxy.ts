import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

const { auth } = NextAuth(authConfig)

// Redirects are decided in auth.config.ts authorized().
export default auth

export const config = {
    // Skips API routes, Next's own files, the sign-in screens, and every path
    // with a file extension: the manifest, sw.js, offline.html and the icons
    // must load signed out, and a redirect breaks installing and updating.
    matcher: ["/((?!api|_next/static|_next/image|onboarding|login|.*\\.[a-z0-9]+$).*)"],
}
