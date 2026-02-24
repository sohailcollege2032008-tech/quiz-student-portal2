import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Book, Bookmark, LogOut, ChevronRight, User, Ticket } from 'lucide-react'
import { logout } from '@/app/actions/access-actions'

export default async function DashboardPage() {
    const cookieStore = await cookies()
    const accessCode = cookieStore.get('student-access-code')?.value

    if (!accessCode) {
        // This should be handled by middleware, but as a fallback:
        return (
            <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
                    <Link href="/login" className="text-blue-500 hover:underline">Return to Login</Link>
                </div>
            </main>
        )
    }

    const supabase = createAdminClient()

    // Fetch the book for this specific access code
    const { data: codeData, error } = await supabase
        .from('access_codes')
        .select('*, books(*)')
        .eq('code', accessCode)
        .single()

    const book = codeData?.books

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            {/* Navigation */}
            <nav className="border-b border-white/5 bg-white/[0.02] backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="font-bold text-lg">Q</span>
                        </div>
                        <span className="font-bold text-xl tracking-tight">Student Portal</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-400" />
                            </div>
                            <span className="text-sm text-gray-300 font-mono">{accessCode}</span>
                        </div>
                        <form action={logout}>
                            <button type="submit" className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400">
                                <LogOut className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Header Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                    <div className="p-6 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                                <Book className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-blue-400 text-sm font-medium">Unlocked Books</p>
                                <h2 className="text-3xl font-bold">{book ? 1 : 0}</h2>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-purple-600/10 border border-purple-500/20 rounded-2xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                                <Bookmark className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-purple-400 text-sm font-medium">Access Status</p>
                                <h2 className="text-3xl font-bold text-emerald-400">Lifetime</h2>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold">My Content</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {book ? (
                            <Link href={`/book/${book.id}`} className="group cursor-pointer">
                                <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl hover:bg-white/[0.05] hover:border-blue-500/30 transition-all duration-300">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg flex items-center justify-center">
                                            <span className="text-xs font-bold uppercase tracking-tighter transform -rotate-90">STUDY</span>
                                        </div>
                                        <div className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded uppercase border border-emerald-500/20">
                                            Active
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-lg mb-1 group-hover:text-blue-400 transition-colors">
                                        {book.title}
                                    </h4>
                                    <p className="text-gray-500 text-sm line-clamp-2 mb-6">
                                        {book.description || 'No description available for this book.'}
                                    </p>
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <span className="text-xs text-gray-500">Full Access</span>
                                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            </Link>
                        ) : (
                            <div className="col-span-full py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                    <Ticket className="w-8 h-8 text-gray-600" />
                                </div>
                                <h4 className="text-lg font-medium text-gray-300">No content found</h4>
                                <p className="text-gray-500 text-sm mb-6 max-w-xs">There was an issue linking your code to a book. Please contact support.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
