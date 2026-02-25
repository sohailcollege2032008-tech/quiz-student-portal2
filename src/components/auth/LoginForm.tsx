'use client'

import { useState, useEffect } from 'react'
import { verifyAccessCode, linkAccessCodes } from '@/app/actions/access-actions'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Key, Loader2, BookOpen, ChevronRight, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm({ isInline = false }: { isInline?: boolean }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [showRedeem, setShowRedeem] = useState(false)
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [user, setUser] = useState<any>(null)
    const searchParams = useSearchParams()
    const supabase = createClient()

    useEffect(() => {
        const queryError = searchParams.get('error')
        if (queryError) {
            setError(decodeURIComponent(queryError))
        }
    }, [searchParams])

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        checkUser()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setUser(session.user)
                // Link any guest progress if they just signed in
                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    await linkAccessCodes()
                }
            } else {
                setUser(null)
            }
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            if (isSignUp) {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                })
                if (signUpError) throw signUpError
                setSuccess(true)
                // If email confirmation is disabled, user is logged in immediately
                const currentUser = await supabase.auth.getUser()
                if (currentUser.data.user) {
                    const returnTo = searchParams.get('returnTo') || '/dashboard'
                    window.location.href = returnTo
                } else {
                    setError('Check your email for the confirmation link!')
                }
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (signInError) throw signInError
                setSuccess(true)
                const returnTo = searchParams.get('returnTo') || '/dashboard'
                window.location.href = returnTo
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        setLoading(true)
        setError(null)
        try {
            const { error: signInError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })
            if (signInError) throw signInError
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    const handleAccess = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!code) return
        setLoading(true)
        setError(null)
        setSuccess(false)

        try {
            // 1. Check if logged in. If not, we still allow code verification,
            // but the user will only get cookie-based access, not account-linked access.
            // Wait, per user request: "If user is not logged in, ask them to login first"
            if (!user) {
                setError('Please login or create an account first to redeem this code.')
                setLoading(false)
                return
            }

            // 2. Verify Code
            const result = await verifyAccessCode(code.trim())

            if (result.error) {
                setError(result.error)
                setLoading(false)
            } else {
                setSuccess(true)
                setCode('')
                setTimeout(() => {
                    if (isInline) {
                        window.location.reload()
                    } else {
                        const returnTo = searchParams.get('returnTo') || '/dashboard'
                        window.location.href = returnTo
                    }
                }, 1000)
            }
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    if (isInline) {
        return (
            <div className="space-y-4">
                <form onSubmit={handleAccess} className="relative group">
                    <input
                        type="text"
                        placeholder="Enter Code to Unlock"
                        className="w-full pl-4 pr-12 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-white placeholder:text-gray-600 transition-all font-mono text-sm tracking-widest uppercase"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading || success}
                        className="absolute right-1 top-1 bottom-1 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all flex items-center justify-center disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (success ? '✓' : <ChevronRight className="w-4 h-4" />)}
                    </button>
                    {error && <p className="absolute -bottom-5 left-0 text-[10px] text-red-400 truncate w-full">{error}</p>}
                    {success && <p className="absolute -bottom-5 left-0 text-[10px] text-emerald-400 truncate w-full">Book Unlocked!</p>}
                </form>
            </div>
        )
    }

    if (showRedeem) {
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
                    <h1 className="text-3xl font-bold text-white text-center">Unlock Content</h1>
                    <p className="text-gray-400 mt-2 text-center text-sm">
                        Enter your activation code to unlock your books
                    </p>
                </div>

                <form onSubmit={handleAccess} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Access Code</label>
                        <div className="relative">
                            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                placeholder="ABCD-1234"
                                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder:text-gray-600 transition-all text-center tracking-widest font-mono uppercase"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-sm text-red-400 text-center">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || success}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 shadow-lg shadow-blue-600/20"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (success ? 'Success!' : 'Unlock Now')}
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowRedeem(false)}
                        className="w-full text-xs text-blue-400 uppercase tracking-widest font-bold"
                    >
                        Back to Login
                    </button>
                </form>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
        >
            <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                    <User className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white text-center">Student Portal</h1>
                <p className="text-gray-400 mt-2 text-center text-sm">
                    {isSignUp ? 'Create your account to save progress' : 'Welcome back, student!'}
                </p>
            </div>

            <div className="space-y-4">
                <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-3 px-4 bg-white text-black font-bold rounded-xl transition-all flex items-center justify-center gap-3 hover:bg-gray-200 active:scale-95 disabled:opacity-50"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="currentColor"
                            d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                    </svg>
                    Continue with Google
                </button>

                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#0a0a0a] px-2 text-gray-500">Or email</span>
                    </div>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div className="space-y-4">
                        <input
                            type="email"
                            placeholder="Email Address"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <div className={`p-3 border rounded-xl text-sm text-center ${success && isSignUp ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-600/20"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : (isSignUp ? 'Create Account' : 'Login')}
                    </button>
                </form>

                <div className="text-center space-y-4">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-xs text-gray-500 hover:text-blue-400 transition-colors uppercase tracking-widest font-bold"
                    >
                        {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                    </button>

                    <div className="pt-4 border-t border-white/5">
                        <button
                            onClick={() => setShowRedeem(true)}
                            className="text-xs text-blue-400/60 hover:text-blue-400 uppercase tracking-widest font-bold transition-colors"
                        >
                            Have an Access Code? Unlock Content
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
