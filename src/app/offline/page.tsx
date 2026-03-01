'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { WifiOff, Book, RefreshCw } from 'lucide-react'

interface CachedBook {
    book: {
        id: string
        title: string
        description: string
    }
    questions: { qr_slug: string; question_text: string }[]
}

export default function OfflinePage() {
    const [cachedBooks, setCachedBooks] = useState<CachedBook[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadCachedBooks = async () => {
            try {
                if (!('caches' in window)) return

                const cache = await caches.open('quiz-books-v1')
                const keys = await cache.keys()
                const bookKeys = keys.filter((req) =>
                    req.url.includes('/__offline_data__/book/')
                )

                const books: CachedBook[] = []
                for (const key of bookKeys) {
                    const response = await cache.match(key)
                    if (response) {
                        const data = await response.json()
                        books.push(data)
                    }
                }

                setCachedBooks(books)
            } catch (err) {
                console.error('Failed to load cached books:', err)
            } finally {
                setLoading(false)
            }
        }

        loadCachedBooks()
    }, [])

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6">
            <div className="max-w-lg w-full space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-indigo-600/10 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
                        <WifiOff className="w-10 h-10 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold mb-2">أنت غير متصل بالإنترنت</h1>
                        <p className="text-gray-400">
                            الكتب المحملة مسبقاً تظهر بالأسفل - يمكنك الاستمرار في المذاكرة بدون نت.
                        </p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-400 hover:bg-white/10 transition-all"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>إعادة المحاولة</span>
                    </button>
                </div>

                {/* Cached Books */}
                {loading ? (
                    <div className="text-center text-gray-600 py-8">جاري التحميل...</div>
                ) : cachedBooks.length > 0 ? (
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                            الكتب المتاحة بدون نت ({cachedBooks.length})
                        </h2>
                        {cachedBooks.map(({ book, questions }) => (
                            <Link
                                key={book.id}
                                href={`/offline/book/${book.id}`}
                                className="group flex items-center gap-4 p-4 bg-white/[0.03] border border-white/10 rounded-2xl hover:border-indigo-500/30 hover:bg-white/[0.06] transition-all"
                            >
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Book className="w-6 h-6 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                                        {book.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {questions.length} سؤال محمل ✅
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                        <Book className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-500">لا يوجد كتب محملة بعد.</p>
                        <p className="text-gray-600 text-sm mt-2">
                            اتصل بالإنترنت وحمل الكتب من صفحة الكتاب.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
