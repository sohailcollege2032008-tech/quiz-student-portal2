import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Book, Bookmark, LogOut, ChevronRight, User, Ticket } from 'lucide-react'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login?returnTo=/dashboard')
    }

    // Fetch activated books
    const { data: activations } = await supabase
        .from('user_book_activations')
        .select('*, books(*)')
        .eq('user_id', user.id)

    // Fetch review list count
    const { count: reviewCount } = await supabase
        .from('review_list')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

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
                        <Link href="/redeem" className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                            + Redeem Code
                        </Link>
                        <div className="h-4 w-[1px] bg-white/10" />
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-400" />
                            </div>
                            <span className="text-sm text-gray-300 hidden md:inline">{user.email}</span>
                        </div>
                        <Link href="/auth/signout" className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400">
                            <LogOut className="w-5 h-5" />
                        </Link>
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
                                <p className="text-blue-400 text-sm font-medium">Activated Books</p>
                                <h2 className="text-3xl font-bold">{activations?.length || 0}</h2>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-purple-600/10 border border-purple-500/20 rounded-2xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                                <Bookmark className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-purple-400 text-sm font-medium">Review List Items</p>
                                <h2 className="text-3xl font-bold">{reviewCount || 0}</h2>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold">My Books</h3>
                        <Link href="/redeem" className="text-sm text-blue-400 hover:underline">View All</Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activations && activations.length > 0 ? (
                            activations.map((act) => (
                                <Link key={act.id} href={`/book/${act.book_id}`} className="group cursor-pointer">
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
                                            {act.books?.title}
                                        </h4>
                                        <p className="text-gray-500 text-sm line-clamp-2 mb-6">
                                            {act.books?.description || 'No description available for this book.'}
                                        </p>
                                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                            <span className="text-xs text-gray-500">Unlocked on {new Date(act.activated_at).toLocaleDateString()}</span>
                                            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="col-span-full py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                    <Ticket className="w-8 h-8 text-gray-600" />
                                </div>
                                <h4 className="text-lg font-medium text-gray-300">No books unlocked yet</h4>
                                <p className="text-gray-500 text-sm mb-6 max-w-xs">Redeem an access code found in your physical material to get started.</p>
                                <Link href="/redeem" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all">
                                    Redeem Code
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
