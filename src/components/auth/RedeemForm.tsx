'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Ticket, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

import { redeemCodeAction } from '@/app/actions/redeem-actions'

export default function RedeemForm() {
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
    const router = useRouter()

    const handleRedeem = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setStatus(null)

        try {
            const result = await redeemCodeAction(code)

            if (result.error) {
                throw new Error(result.error)
            }

            setStatus({
                type: 'success',
                message: result.message || 'Success'
            })

            setTimeout(() => {
                router.push('/dashboard')
                router.refresh()
            }, 2000)

        } catch (err: any) {
            setStatus({ type: 'error', message: err.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
        >
            <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
                    <Ticket className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">Redeem Code</h1>
                <p className="text-gray-400 mt-2 text-center">Enter your activation code to unlock your book</p>
            </div>

            <form onSubmit={handleRedeem} className="space-y-6">
                <div className="space-y-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="ENTER-CODE-HERE"
                            className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white text-center text-xl font-mono tracking-widest placeholder:text-gray-600 transition-all"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            required
                        />
                    </div>
                </div>

                {status && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center gap-3 p-4 rounded-xl ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                    >
                        {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <p className="text-sm font-medium">{status.message}</p>
                    </motion.div>
                )}

                <button
                    type="submit"
                    disabled={loading || !code}
                    className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Activate Now'}
                </button>
            </form>
        </motion.div>
    )
}
