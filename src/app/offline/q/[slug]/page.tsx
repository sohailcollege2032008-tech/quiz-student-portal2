'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import QuestionDisplay from '@/components/question/QuestionDisplay'
import { ChevronLeft, BookOpen, GraduationCap, WifiOff } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { matchFromBooksCache } from '@/lib/offline/cache-utils'

export default function OfflineQuestionPage() {
    const params = useParams()
    const slug = params?.slug as string

    const [question, setQuestion] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!slug) return

        const loadFromCache = async () => {
            try {
                if (!('caches' in window)) {
                    setError('الكاش غير متاح في هذا المتصفح')
                    return
                }

                const response = await matchFromBooksCache(
                    `${window.location.origin}/__offline_data__/q/${slug}`
                )

                if (!response) {
                    setError('هذا السؤال غير محمل للاستخدام بدون نت')
                    return
                }

                const data = await response.json()
                // Reconstruct the question object to match what QuestionDisplay expects
                const reconstructed = {
                    ...data,
                    books: data._cached_book,
                    topics: data._cached_topics?.find((t: any) => t.id === data.topic_id) || null,
                }
                setQuestion(reconstructed)
            } catch (err) {
                console.error('Failed to load question from cache:', err)
                setError('فشل تحميل السؤال من الكاش')
            } finally {
                setLoading(false)
            }
        }

        loadFromCache()
    }, [slug])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
                    <p className="text-gray-400">جاري التحميل من الكاش...</p>
                </div>
            </div>
        )
    }

    if (error || !question) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center space-y-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                    <WifiOff className="w-10 h-10 text-red-500" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold mb-2">السؤال غير متاح</h2>
                    <p className="text-gray-400 max-w-sm">
                        {error || 'هذا السؤال غير محمل للاستخدام بدون نت. اتصل بالإنترنت وافتح الكتاب أولاً.'}
                    </p>
                </div>
                <Link href="/offline">
                    <Button variant="ghost">← الكتب المتاحة</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-2 md:p-8">
            <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
                {/* Offline Badge */}
                <div className="flex items-center justify-between px-1 md:px-0">
                    <Link href={`/offline/book/${question.book_id}`}>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white px-2 md:px-3">
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            <span>رجوع</span>
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-400">
                            <BookOpen className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate max-w-[100px] md:max-w-[150px]">{question.books?.title}</span>
                            <span className="text-gray-600">/</span>
                            <GraduationCap className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                            <span className="truncate max-w-[80px] md:max-w-[150px]">{question.topics?.title || 'General'}</span>
                        </div>
                        <div className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                            <WifiOff className="w-3 h-3 text-indigo-400" />
                            <span className="text-[10px] text-indigo-400 font-bold">OFFLINE</span>
                        </div>
                    </div>
                </div>

                {/* Question Content */}
                <QuestionDisplay
                    question={question}
                    isActivated={true}
                    initialIsInReviewList={false}
                />
            </div>
        </div>
    )
}
