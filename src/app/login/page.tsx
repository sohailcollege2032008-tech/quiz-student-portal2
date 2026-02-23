import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
    return (
        <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />

            <LoginForm />
        </main>
    )
}
