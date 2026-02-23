import { Suspense } from 'react'
import LoginForm from '@/components/auth/LoginForm'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
    return (
        <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />

            <Suspense fallback={
                <div className="w-full max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            }>
                <LoginForm />
            </Suspense>
        </main>
    )
}
