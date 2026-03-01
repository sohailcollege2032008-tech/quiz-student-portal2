'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, ChevronRight, WifiOff, HelpCircle, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { matchFromBooksCache } from '@/lib/offline/cache-utils'

interface CachedQuestion {
    id: string
    qr_slug: string
    question_text: string
    topic_id: string | null
    type: string
}

interface CachedTopic {
    id: string
    title: string
}

interface BookData {
    book: { id: string; title: string; description: string }
    topics: CachedTopic[]
    questions: CachedQuestion[]
}

export default function OfflineBookPage() {
    const params = useParams()
    const bookId = params?.id as string

    const [bookData, setBookData] = useState<BookData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!bookId) return

        const loadFromCache = async () => {
            try {
                if (!('caches' in window)) return
                const response = await matchFromBooksCache(
                    `${window.location.origin}/__offline_data__/book/${bookId}`
                )
                if (response) {
                    const data = await response.json()
                    setBookData(data)
                }
            } catch (err) {
                console.error('Failed to load book from cache:', err)
            } finally {
                setLoading(false)
            }
        }

        loadFromCache()
    }, [bookId])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
        )
    }

    if (!bookData) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-6 p-6 text-center">
                <WifiOff className="w-16 h-16 text-gray-600" />
                <div>
                    <h2 className="text-2xl font-bold mb-2">الكتاب غير محمل</h2>
                    <p className="text-gray-400">اتصل بالإنترنت وحمل الكتاب أولاً من صفحته.</p>
                </div>
                <Link href="/offline"><Button variant="ghost">← العودة</Button></Link>
            </div>
        )
    }

    const { book, topics, questions } = bookData

    const questionsByTopic: Record<string, CachedQuestion[]> = {}
    const untrackedQuestions: CachedQuestion[] = []

    questions.forEach((q) => {
        if (q.topic_id) {
            if (!questionsByTopic[q.topic_id]) questionsByTopic[q.topic_id] = []
            questionsByTopic[q.topic_id].push(q)
        } else {
            untrackedQuestions.push(q)
        }
    })

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3">
                        <Link href="/offline">
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white -ml-2">
                                <ChevronLeft className="w-4 h-4 mr-1" /> الكتب المتاحة
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{book.title}</h1>
                            {book.description && (
                                <p className="text-gray-400 mt-1">{book.description}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex-shrink-0">
                        <WifiOff className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Offline</span>
                    </div>
                </div>

                <div className="h-px bg-white/5" />

                {/* Topics & Questions */}
                <div className="space-y-12 pb-20">
                    {topics.map((topic) => {
                        const topicQuestions = questionsByTopic[topic.id] || []
                        return (
                            <section key={topic.id} className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                        <GraduationCap className="w-4 h-4" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-100">{topic.title}</h2>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {topicQuestions.map((q, idx) => (
                                        <a key={q.id} href={`/offline/q/${q.qr_slug}`}>
                                            <div className="group flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] hover:border-blue-500/30 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs font-mono text-gray-600 w-6">{(idx + 1).toString().padStart(2, '0')}</span>
                                                    <p className="text-sm text-gray-300 line-clamp-1 group-hover:text-white">{q.question_text}</p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </a>
                                    ))}
                                    {topicQuestions.length === 0 && (
                                        <p className="text-sm text-gray-600 italic ml-11">لا يوجد أسئلة لهذا الموضوع.</p>
                                    )}
                                </div>
                            </section>
                        )
                    })}

                    {untrackedQuestions.length > 0 && (
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gray-500/10 flex items-center justify-center text-gray-400 border border-gray-500/20">
                                    <HelpCircle className="w-4 h-4" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-100">أسئلة أخرى</h2>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {untrackedQuestions.map((q, idx) => (
                                    <a key={q.id} href={`/offline/q/${q.qr_slug}`}>
                                        <div className="group flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] hover:border-blue-500/30 transition-all">
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs font-mono text-gray-600 w-6">{(idx + 1).toString().padStart(2, '0')}</span>
                                                <p className="text-sm text-gray-300 line-clamp-1 group-hover:text-white">{q.question_text}</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    )
}
