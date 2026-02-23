import RedeemForm from '@/components/auth/RedeemForm'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function RedeemPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login?returnTo=/redeem')
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
