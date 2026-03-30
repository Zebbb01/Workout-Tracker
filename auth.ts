import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import { authConfig } from "./auth.config"


export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    // @ts-ignore
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" }, // Override default 'database' to ensure JWT for edge middleware
    callbacks: {
        ...authConfig.callbacks,
        session: async ({ session, token }) => {
            if (session?.user && token?.sub) {
                session.user.id = token.sub;
            }
            return session;
        }
    }
})
