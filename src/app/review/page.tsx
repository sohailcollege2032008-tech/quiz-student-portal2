import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Bookmark, BookOpen, GraduationCap, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ReviewPage() {
    const supabaseServer = await createClient()
    const { data: { user } } = await supabaseServer.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const supabaseAdmin = createAdminClient()

    // Fetch review list with joined questions, books, and topics
    const { data: reviewItems } = await supabaseAdmin
        .from('review_list')
        .select(`
            id,
            created_at,
            questions (
                id,
                question_text,
                qr_slug,
                books (title),
                topics (title)
            )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-4">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white -ml-2">
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Back to Dashboard
                            </Button>
                        </Link>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-xl flex items-center justify-center border border-white/10">
                                <Bookmark className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">My Review List</h1>
                                <p className="text-gray-400 mt-1">
                                    {reviewItems?.length || 0} Saved {reviewItems?.length === 1 ? 'Question' : 'Questions'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-white/5" />

                {/* Questions List */}
                <div className="space-y-4 pb-20">
                    {reviewItems && reviewItems.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {reviewItems.map((item: any, idx) => {
                                const q = item.questions
                                if (!q) return null;

                                const bookTitle = Array.isArray(q.books) ? q.books[0]?.title : q.books?.title
                                const topicTitle = Array.isArray(q.topics) ? q.topics[0]?.title : q.topics?.title

                                return (
                                    <Link key={item.id} href={`/q/${q.qr_slug}`}>
                                        <div className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] hover:border-emerald-500/30 transition-all gap-4">
                                            <div className="flex items-start gap-4 flex-1">
                                                <span className="text-xs font-mono text-gray-500 w-6 pt-0.5">{(idx + 1).toString().padStart(2, '0')}</span>
                                                <div className="space-y-2 flex-1">
                                                    <p className="text-sm text-gray-300 line-clamp-2 group-hover:text-white transition-colors">
                                                        {q.question_text}
                                                    </p>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                                                            <BookOpen className="w-3 h-3 text-blue-400/70" />
                                                            <span className="truncate max-w-[150px] sm:max-w-[200px]">{bookTitle || 'Unknown Book'}</span>
                                                        </div>
                                                        {topicTitle && (
                                                            <>
                                                                <span className="text-gray-700">•</span>
                                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                                                                    <GraduationCap className="w-3 h-3 text-emerald-400/70" />
                                                                    <span className="truncate max-w-[150px] sm:max-w-[200px]">{topicTitle}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-end sm:justify-center w-full sm:w-auto">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 group-hover:bg-emerald-500/20 transition-colors">
                                                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="py-24 bg-white/[0.02] border border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                <Bookmark className="w-10 h-10 text-gray-600" />
                            </div>
                            <h4 className="text-2xl font-black text-gray-300 mb-2 whitespace-nowrap">Your list is empty</h4>
                            <p className="text-gray-500 text-lg mb-8 max-w-sm">
                                When you find questions you want to review later, click the 'Add to Review' button on the question page.
                            </p>
                            <Link href="/dashboard">
                                <Button variant="outline" className="border-white/10 hover:bg-white/10">
                                    Explore Books
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
