'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, CheckCircle2, Loader2, WifiOff, Trash2 } from 'lucide-react'

interface OfflineDownloadButtonProps {
    bookId: string
    bookTitle: string
}

type DownloadStatus = 'idle' | 'checking' | 'downloading' | 'done' | 'error'

export default function OfflineDownloadButton({ bookId, bookTitle }: OfflineDownloadButtonProps) {
    const [status, setStatus] = useState<DownloadStatus>('checking')
    const [progress, setProgress] = useState(0)
    const [questionCount, setQuestionCount] = useState(0)
    const [errorMsg, setErrorMsg] = useState('')
    const [swRegistered, setSwRegistered] = useState(false)

    // Register Service Worker and check cache status on mount
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return

        let sw: ServiceWorker | null = null

        const init = async () => {
            try {
                const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
                await navigator.serviceWorker.ready
                sw = reg.active || reg.installing || reg.waiting
                setSwRegistered(true)

                // Ask SW if this book is cached
                const activeWorker = reg.active
                if (activeWorker) {
                    activeWorker.postMessage({
                        type: 'CHECK_BOOK_CACHED',
                        payload: { bookId }
                    })
                }
            } catch (err) {
                console.error('SW registration failed:', err)
                setStatus('idle') // Fallback: show button but can't cache
            }
        }

        // Listen for messages from SW
        const handleMessage = (event: MessageEvent) => {
            const { data } = event
            if (!data || data.bookId !== bookId) return

            if (data.type === 'BOOK_CACHE_STATUS') {
                setStatus(data.isCached ? 'done' : 'idle')
            }
            if (data.type === 'DOWNLOAD_PROGRESS') {
                setStatus('downloading')
                setProgress(data.progress || 0)
            }
            if (data.type === 'DOWNLOAD_COMPLETE') {
                setProgress(100)
                setQuestionCount(data.questionCount || 0)
                // Pre-cache JS chunks for offline pages BEFORE marking as done
                preCacheOfflinePageChunks(data.questionCount).then(() => {
                    setStatus('done')
                })
            }
            if (data.type === 'DOWNLOAD_ERROR') {
                setStatus('error')
                setErrorMsg(data.error || 'Download failed')
            }
            if (data.type === 'BOOK_CACHE_DELETED') {
                setStatus('idle')
                setProgress(0)
            }
        }

        navigator.serviceWorker.addEventListener('message', handleMessage)
        init()

        return () => {
            navigator.serviceWorker.removeEventListener('message', handleMessage)
        }
    }, [bookId])

    /**
     * After download: fetch offline page HTML from the CLIENT (not SW),
     * extract all /_next/static/ script/link URLs, and pre-fetch them.
     * This triggers the SW's cacheFirstImmutable() to cache the JS chunks.
     */
    const preCacheOfflinePageChunks = async (qCount: number) => {
        try {
            const pagesToWarm = [
                '/offline',
                `/offline/book/${bookId}`,
            ]

            for (const pageUrl of pagesToWarm) {
                const resp = await fetch(pageUrl)
                if (!resp.ok) continue
                const html = await resp.text()

                // Find all /_next/static/ URLs in the HTML (scripts, CSS, etc.)
                const staticUrls = html.match(/\/_next\/static\/[^"'\s)]+/g) || []
                const uniqueUrls = [...new Set(staticUrls)]

                // Fetch each one - the SW will cache them via cacheFirstImmutable()
                await Promise.all(
                    uniqueUrls.map((url) => fetch(url).catch(() => { }))
                )
            }

            // Also warm up ONE offline question page so its JS chunk is cached
            // (all /offline/q/[slug] pages share the same JS bundle)
            if (qCount > 0) {
                try {
                    // We need to find one cached question slug
                    const cacheNames = await caches.keys()
                    for (const name of cacheNames) {
                        if (!name.startsWith('quiz-')) continue
                        const cache = await caches.open(name)
                        const keys = await cache.keys()
                        const qKey = keys.find((r) => r.url.includes('/__offline_data__/q/'))
                        if (qKey) {
                            const slug = qKey.url.split('/__offline_data__/q/')[1]
                            const qResp = await fetch(`/offline/q/${slug}`)
                            if (qResp.ok) {
                                const qHtml = await qResp.text()
                                const qStaticUrls = qHtml.match(/\/_next\/static\/[^"'\s)]+/g) || []
                                await Promise.all(
                                    [...new Set(qStaticUrls)].map((url) => fetch(url).catch(() => { }))
                                )
                            }
                            break
                        }
                    }
                } catch { /* non-critical */ }
            }
        } catch (err) {
            console.warn('Could not pre-cache offline page chunks:', err)
        }
    }

    const handleDownload = useCallback(async () => {
        if (!('serviceWorker' in navigator)) return
        setStatus('downloading')
        setProgress(5)

        try {
            const reg = await navigator.serviceWorker.ready
            reg.active?.postMessage({
                type: 'DOWNLOAD_BOOK',
                payload: { bookId }
            })
        } catch (err) {
            setStatus('error')
            setErrorMsg('Could not start download')
        }
    }, [bookId])

    const handleDelete = useCallback(async () => {
        if (!('serviceWorker' in navigator)) return
        try {
            const reg = await navigator.serviceWorker.ready
            reg.active?.postMessage({
                type: 'DELETE_BOOK_CACHE',
                payload: { bookId }
            })
        } catch (err) {
            console.error('Delete cache error:', err)
        }
    }, [bookId])

    // Don't render if service workers aren't supported
    if (!('serviceWorker' in navigator) && typeof window !== 'undefined') {
        return null
    }

    if (status === 'checking') {
        return (
            <div className="flex items-center gap-2 px-4 py-2 text-gray-500 text-xs rounded-xl border border-white/5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Checking...</span>
            </div>
        )
    }

    if (status === 'downloading') {
        return (
            <div className="flex flex-col gap-2 px-4 py-3 bg-blue-600/10 border border-blue-500/20 rounded-xl min-w-[180px]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Downloading...</span>
                    </div>
                    <span className="text-xs font-mono text-blue-300">{progress}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        )
    }

    if (status === 'done') {
        return (
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl">
                    <WifiOff className="w-3.5 h-3.5" />
                    <span className="uppercase tracking-widest">متاح بدون نت</span>
                    {questionCount > 0 && (
                        <span className="text-emerald-500/60">({questionCount} سؤال)</span>
                    )}
                </div>
                <button
                    onClick={handleDelete}
                    title="Remove offline data"
                    className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-white/5 transition-all"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        )
    }

    if (status === 'error') {
        return (
            <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-bold rounded-xl transition-all uppercase tracking-widest"
                title={errorMsg}
            >
                <Download className="w-3.5 h-3.5" />
                <span>فشل التحميل - حاول تاني</span>
            </button>
        )
    }

    // idle state
    return (
        <button
            onClick={handleDownload}
            disabled={!swRegistered}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20 hover:border-indigo-500/40 hover:text-indigo-300 text-xs font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest active:scale-95"
        >
            <Download className="w-3.5 h-3.5" />
            <span>تحميل للاستخدام بدون نت</span>
        </button>
    )
}
