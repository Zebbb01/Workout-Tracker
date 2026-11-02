import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
    // Callback handle in auth.config.ts authorized()
})

export const config = {
    // Exclude onboarding, login, api routes, and static files from middleware
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|onboarding|login|manifest.json|icon-|sw.js).*)"],
}
