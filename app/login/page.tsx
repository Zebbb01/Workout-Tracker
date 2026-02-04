import { signIn } from "@/auth"
import { Dumbbell } from "lucide-react"

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl -z-10 animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl -z-10" />

            <div className="glass-card w-full max-w-md p-8 text-center space-y-8 animate-in border-orange-500/20">
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="bg-gradient-to-br from-orange-500 to-red-600 p-4 rounded-2xl shadow-lg shadow-orange-500/20 inline-block">
                        <Dumbbell size={40} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Body Tracker <span className="text-orange-500">Pro</span></h1>
                    <p className="text-zinc-500 text-sm">Sign in to sync your workouts, track progress, and crush your goals.</p>
                </div>

                <form
                    action={async () => {
                        "use server"
                        await signIn("google", { redirectTo: "/" })
                    }}
                >
                    <button
                        type="submit"
                        className="w-full glass-button group relative overflow-hidden rounded-xl p-[1px] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-black"
                    >
                        <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2E8F0_0%,#501c0c_50%,#E2E8F0_100%)] opacity-0 group-hover:opacity-20 transition-opacity" />
                        <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-xl bg-zinc-900 px-8 py-4 text-sm font-medium text-white backdrop-blur-3xl transition-colors group-hover:bg-zinc-800 gap-3">
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Continue with Google
                        </span>
                    </button>
                </form>

                <p className="text-xs text-zinc-600">
                    By continuing, you verify that you are authorized to access this device.
                </p>
            </div>
        </div>
    )
}
