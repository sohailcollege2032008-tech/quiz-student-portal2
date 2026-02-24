'use client'

import { useState } from 'react'
import { verifyAccessCode } from '@/app/actions/access-actions'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Key, Loader2, BookOpen } from 'lucide-react'
import Link from 'next/link'

export default function LoginForm() {
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const searchParams = useSearchParams()

    const handleAccess = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const result = await verifyAccessCode(code.trim())

        if (result.error) {
            setError(result.error)
            setLoading(false)
        } else {
            // Success! Redirect to dashboard or returnTo
            const returnTo = searchParams.get('returnTo') || '/dashboard'
            window.location.href = returnTo
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
        >
            <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                    <Key className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white text-center">Student Portal</h1>
                <p className="text-gray-400 mt-2 text-center">Enter your access code to view your books</p>
            </div>

            <form onSubmit={handleAccess} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Access Code</label>
                    <div className="relative">
                        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Enter your code (e.g. ABCD-1234)"
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder:text-gray-600 transition-all text-center tracking-widest font-mono"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            required
                        />
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-sm text-red-400 text-center">
                            {error}
                        </p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 shadow-lg shadow-blue-600/20"
                >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Enter Portal'}
                </button>

                <div className="text-center">
                    <p className="text-xs text-gray-500">
                        Enter your unique redemption code provided with your book.
                    </p>
                </div>
            </form>
        </motion.div>
    )
}
