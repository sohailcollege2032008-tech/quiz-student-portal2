import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Book, Bookmark, LogIn, LogOut, ChevronRight, User, Ticket, Settings } from 'lucide-react'
import { logout } from '@/app/actions/access-actions'
import LoginForm from '@/components/auth/LoginForm'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
    const cookieStore = await cookies()
    const accessCookie = cookieStore.get('student-access-code')?.value || ""
    const accessCodes = accessCookie.split(',').filter(c => c.trim().length > 0)

    const supabaseAdmin = createAdminClient()
    const supabaseServer = await createClient()

    // 0. Get Authenticated User
    const { data: { user } } = await supabaseServer.auth.getUser()

    // 1. Fetch ALL Free Books
    const { data: freeBooks } = await supabaseAdmin
        .from('books')
        .select('*')
        .eq('is_free', true)
        .eq('is_published', true)
        .order('title', { ascending: true })

    // 2. Fetch Books for specific access codes (from cookies)
    let unlockedBooks: any[] = []
    if (accessCodes.length > 0) {
        const { data: codeData } = await supabaseAdmin
            .from('access_codes')
            .select('*, books(*)')
            .in('code', accessCodes)

        unlockedBooks = codeData?.map(d => d.books).filter(Boolean) || []
    }

    // Fetch Books unlocked by the user in the database
    if (user) {
        const { data: userActivations } = await supabaseAdmin
            .from('user_book_activations')
            .select('*, books(*)')
            .eq('user_id', user.id)

        const dbUnlockedBooks = userActivations?.map(a => a.books).filter(Boolean) || []
        unlockedBooks = [...unlockedBooks, ...dbUnlockedBooks]
    }

    // 3. Fetch Review List Count
    let reviewCount = 0
    if (user) {
        const { count, error: countError } = await supabaseAdmin
            .from('review_list')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

        if (!countError) reviewCount = count || 0
    }

    // Combine and deduplicate books
    const allBooksMap = new Map();
    freeBooks?.forEach(b => allBooksMap.set(b.id, { ...b, isFree: true }));

    const unlockedMap = new Map();
    unlockedBooks.forEach(b => {
        unlockedMap.set(b.id, b);
        allBooksMap.set(b.id, { ...b, isUnlocked: true });
    });

    const allBooks = Array.from(allBooksMap.values())
    const unlockedCount = unlockedMap.size;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            {/* Navigation */}
            <nav className="border-b border-white/5 bg-white/[0.02] backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="font-bold text-lg">Q</span>
                        </div>
                        <span className="font-bold text-xl tracking-tight italic">Quiz Engine</span>
                    </div>

                    <div className="flex items-center gap-6">
                        {unlockedCount > 0 && (
                            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                                <Ticket className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-[10px] text-blue-400 font-mono font-bold tracking-widest uppercase">
                                    {unlockedCount} Books Active
                                </span>
                            </div>
                        )}

                        {user ? (
                            <form action={logout}>
                                <button type="submit" className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all text-gray-400 text-sm group">
                                    <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                    <span>Exit Portal</span>
                                </button>
                            </form>
                        ) : (
                            <Link href="/login" className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all text-sm group shadow-lg shadow-blue-500/20 active:scale-95">
                                <LogIn className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span>تسجيل الدخول</span>
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white ring-4 ring-blue-600/10">
                                <User className="w-6 h-6" />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight">
                                Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">{user ? 'Student' : 'Guest'}</span>
                            </h1>
                        </div>
                        <p className="text-gray-500 text-lg max-w-xl">
                            {user
                                ? "Great to see you again! Continue your learning or redeem a new book below."
                                : "Explore our free content or join the portal to unlock personalized features and save progress."}
                        </p>
                    </div>

                    <div className="w-full md:w-96 p-1.5 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
                        <LoginForm isInline={true} />
                    </div>
                </div>

                {/* Header Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="group p-8 bg-blue-600/5 border border-blue-500/10 rounded-3xl hover:border-blue-500/30 transition-all duration-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Book className="w-32 h-32 transform rotate-12" />
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/30">
                                <Book className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-blue-400/80 text-sm font-bold uppercase tracking-widest mb-1">Total Library</p>
                                <h2 className="text-4xl font-black tracking-tighter">{allBooks.length} Books</h2>
                            </div>
                        </div>
                    </div>

                    {user ? (
                        <Link href="/review" className="group p-8 bg-emerald-600/5 border border-emerald-500/10 rounded-3xl hover:border-emerald-500/30 transition-all duration-500 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Bookmark className="w-32 h-32 transform -rotate-12" />
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-600/30">
                                    <Bookmark className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-emerald-400/80 text-sm font-bold uppercase tracking-widest mb-1">My Review List</p>
                                    <h2 className="text-4xl font-black tracking-tighter text-emerald-400">
                                        {reviewCount} Questions
                                    </h2>
                                </div>
                            </div>
                        </Link>
                    ) : (
                        <div className="group p-8 bg-gray-600/5 border border-gray-500/10 rounded-3xl relative overflow-hidden flex flex-col justify-center">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Bookmark className="w-32 h-32 transform -rotate-12" />
                            </div>
                            <div className="flex items-center gap-6 mb-4">
                                <div className="w-16 h-16 bg-gray-600/60 rounded-2xl flex items-center justify-center opacity-50">
                                    <Bookmark className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-gray-400/80 text-sm font-bold uppercase tracking-widest mb-1">My Review List</p>
                                    <h2 className="text-4xl font-black tracking-tighter text-gray-500">
                                        Locked
                                    </h2>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 relative z-10">Login to save and review questions.</p>
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between border-b border-white/5 pb-6">
                        <h3 className="text-3xl font-black tracking-tight">Explore Books</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 group cursor-help">
                                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                <span className="text-xs font-bold text-emerald-500/80 uppercase tracking-widest">Free</span>
                            </div>
                            <div className="flex items-center gap-2 group cursor-help">
                                <div className="w-3 h-3 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
                                <span className="text-xs font-bold text-blue-500/80 uppercase tracking-widest">Unlocked</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {allBooks.length > 0 ? (
                            allBooks.map(book => (
                                <Link key={book.id} href={`/book/${book.id}`} className="group h-full">
                                    <div className="p-1 h-full bg-gradient-to-br from-white/10 to-white/0 rounded-[2rem] transition-all duration-500 group-hover:scale-[1.02] active:scale-[0.98]">
                                        <div className="p-8 h-full bg-[#0d0d0d] rounded-[1.8rem] relative overflow-hidden border border-white/5">
                                            {/* Glow Effect */}
                                            <div className={`absolute -top-24 -right-24 w-48 h-48 blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-700 ${book.isFree ? 'bg-emerald-500' : 'bg-blue-600'}`} />

                                            <div className="flex items-start justify-between mb-8">
                                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl flex items-center justify-center transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                                                    <Book className="w-7 h-7 text-white" />
                                                </div>
                                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${book.isFree
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : 'bg-blue-600/20 text-blue-400 border-blue-600/30'
                                                    } group-hover:scale-110 transition-transform`}>
                                                    {book.isFree ? 'Free Access' : 'Unlocked'}
                                                </div>
                                            </div>

                                            <h4 className="font-black text-2xl mb-3 leading-tight group-hover:text-blue-400 transition-colors">
                                                {book.title}
                                            </h4>

                                            <p className="text-gray-500 leading-relaxed text-sm line-clamp-3 mb-8">
                                                {book.description || 'Unlock the comprehensive summary, interactive quizzes, and expert insights for this material.'}
                                            </p>

                                            <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                                <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Open Book</span>
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="col-span-full py-24 bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center text-center">
                                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                    <Ticket className="w-12 h-12 text-gray-700" />
                                </div>
                                <h4 className="text-2xl font-black text-gray-300 mb-2 whitespace-nowrap">Your Library is Empty</h4>
                                <p className="text-gray-500 text-lg mb-8 max-w-sm">
                                    Redeem an activation code to unlock your study materials and tracking.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
