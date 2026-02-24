import LoginForm from '@/components/auth/LoginForm'
import RedeemForm from '@/components/auth/RedeemForm'
import { createClient } from '@/lib/supabase/server'

export default async function RedeemPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return (
            <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 -right-20 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px]" />
                <div className="max-w-md w-full relative z-10">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Login Required</h1>
                        <p className="text-gray-400">Sign in to redeem your access code</p>
                    </div>
                    <LoginForm />
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-0 -left-20 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />

            <RedeemForm />
        </main>
    )
}
