// Service Worker for Quiz Engine - Offline Book Support
// Version: 3.0 — Fixed: cache /_next/static/ JS chunks for offline pages
const CACHE_VERSION = 'v3'
const APP_SHELL_CACHE = `quiz-shell-${CACHE_VERSION}`
const BOOKS_CACHE = `quiz-books-${CACHE_VERSION}`
const STATIC_CACHE = `quiz-static-${CACHE_VERSION}`

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting())
})

// ─── Activate: Clean old caches, take control ───────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => {
                        if (!name.startsWith('quiz-')) return false
                        return name !== APP_SHELL_CACHE &&
                            name !== BOOKS_CACHE &&
                            name !== STATIC_CACHE
                    })
                    .map((name) => caches.delete(name))
            )
        }).then(() => self.clients.claim())
    )
})

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event
    const url = new URL(request.url)

    if (request.method !== 'GET') return
    if (url.origin !== self.location.origin) return

    // ── _next/static/ → Cache-First (immutable build artifacts with hashes) ──
    if (url.pathname.startsWith('/_next/static/')) {
        event.respondWith(cacheFirstImmutable(request))
        return
    }

    // Skip other _next routes (_next/data, _next/image, etc.)
    if (url.pathname.startsWith('/_next/')) return

    // Skip API routes except our offline API
    if (url.pathname.startsWith('/api/') && !url.pathname.includes('/offline')) return

    // ── /q/[slug] → Redirect to /offline/q/[slug] when offline ──────────────
    if (url.pathname.startsWith('/q/')) {
        event.respondWith(handleQuestionPage(request, url))
        return
    }

    // ── /offline/q/* pages → Template-based serving ─────────────────────────
    // All /offline/q/[slug] pages render identical HTML (loading spinner).
    // The client-side code uses useParams() to get the slug and reads cache.
    // So we can serve ANY cached /offline/q/* page for ANY /offline/q/* request.
    if (url.pathname.startsWith('/offline/q/')) {
        event.respondWith(handleOfflineQuestionPage(request))
        return
    }

    // ── Other /offline/* pages → Cache-First ──────────────────────────────────
    if (url.pathname.startsWith('/offline')) {
        event.respondWith(cacheFirstWithFallback(request))
        return
    }

    // ── /book/* pages → Network-First (redirect to /offline when offline) ────
    if (url.pathname.startsWith('/book/')) {
        event.respondWith(handleBookPage(request, url))
        return
    }

    // ── Everything else → Network-First with cache ───────────────────────────
    event.respondWith(networkFirstStrategy(request))
})

// ─── Cache-First for immutable _next/static assets ──────────────────────────
async function cacheFirstImmutable(request) {
    // Check all quiz caches for this static file
    const cacheNames = await caches.keys()
    for (const name of cacheNames) {
        if (!name.startsWith('quiz-')) continue
        const cache = await caches.open(name)
        const cached = await cache.match(request)
        if (cached) return cached
    }

    // Not cached → fetch and cache
    try {
        const response = await fetch(request)
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE)
            cache.put(request, response.clone())
        }
        return response
    } catch {
        return new Response('', { status: 503 })
    }
}

// ─── Handle /q/[slug]: network → redirect to offline version ─────────────────
async function handleQuestionPage(request, url) {
    try {
        const response = await fetch(request)
        return response
    } catch {
        // Offline → redirect to /offline/q/[slug]
        const slug = url.pathname.replace('/q/', '')
        return Response.redirect(`${self.location.origin}/offline/q/${slug}`, 302)
    }
}

// ─── Handle /book/[id]: network → redirect to offline version ────────────────
async function handleBookPage(request, url) {
    try {
        const response = await fetch(request)
        return response
    } catch {
        // Offline → redirect to /offline/book/[id]
        const pathParts = url.pathname.split('/')
        const bookId = pathParts[pathParts.length - 1]
        return Response.redirect(`${self.location.origin}/offline/book/${bookId}`, 302)
    }
}

// ─── Handle /offline/q/*: serve template page ────────────────────────────────
// All /offline/q/[slug] pages have IDENTICAL server-rendered HTML (a loading spinner).
// The client-side JS uses useParams() to read the slug from the URL and loads
// the question data from cache. So ANY cached /offline/q/* response works for all.
async function handleOfflineQuestionPage(request) {
    const cacheNames = await caches.keys()

    // 1. Try exact match first
    for (const name of cacheNames) {
        if (!name.startsWith('quiz-')) continue
        const cache = await caches.open(name)
        const cached = await cache.match(request)
        if (cached) return cached
    }

    // 2. Try network (online scenario)
    try {
        const response = await fetch(request)
        if (response.ok) {
            const cache = await caches.open(APP_SHELL_CACHE)
            cache.put(request, response.clone())
            return response
        }
    } catch { /* offline */ }

    // 3. Offline: find ANY cached /offline/q/* page and serve it as a template
    for (const name of cacheNames) {
        if (!name.startsWith('quiz-')) continue
        const cache = await caches.open(name)
        const keys = await cache.keys()
        const templateKey = keys.find(r =>
            new URL(r.url).pathname.startsWith('/offline/q/')
        )
        if (templateKey) {
            const cached = await cache.match(templateKey)
            if (cached) return cached
        }
    }

    // 4. Final fallback
    return new Response(
        '<html><body style="background:#0a0a0a;color:white;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;direction:rtl"><div style="text-align:center"><h1>السؤال غير متاح</h1><p>يرجى تحميل الكتاب أولاً وأنت متصل بالإنترنت</p><a href="/offline" style="color:#60a5fa;margin-top:16px;display:inline-block">← الكتب المتاحة</a></div></body></html>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
    )
}
// ─── Cache-First with offline fallback ────────────────────────────────────────
async function cacheFirstWithFallback(request) {
    // Search all quiz caches
    const cacheNames = await caches.keys()
    for (const name of cacheNames) {
        if (!name.startsWith('quiz-')) continue
        const cache = await caches.open(name)
        const cached = await cache.match(request)
        if (cached) return cached
    }

    try {
        const response = await fetch(request)
        if (response.ok) {
            const cache = await caches.open(APP_SHELL_CACHE)
            cache.put(request, response.clone())
        }
        return response
    } catch {
        return new Response(
            '<html><body style="background:#0a0a0a;color:white;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><div style="text-align:center"><h1>أنت غير متصل</h1><p>يرجى الاتصال بالإنترنت</p></div></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
        )
    }
}

// ─── Network-First Strategy ───────────────────────────────────────────────────
async function networkFirstStrategy(request) {
    try {
        const response = await fetch(request)
        if (response.ok) {
            const cache = await caches.open(APP_SHELL_CACHE)
            cache.put(request, response.clone())
        }
        return response
    } catch {
        // Try all caches
        const cacheNames = await caches.keys()
        for (const name of cacheNames) {
            if (!name.startsWith('quiz-')) continue
            const cache = await caches.open(name)
            const cached = await cache.match(request)
            if (cached) return cached
        }
        return new Response('Offline', { status: 503 })
    }
}

// ─── Message Handler ──────────────────────────────────────────────────────────
self.addEventListener('message', async (event) => {
    if (!event.data) return

    const { type, payload } = event.data

    if (type === 'DOWNLOAD_BOOK') {
        await downloadBookForOffline(payload.bookId, event.source)
    }

    if (type === 'CHECK_BOOK_CACHED') {
        const isCached = await isBookCached(payload.bookId)
        event.source.postMessage({ type: 'BOOK_CACHE_STATUS', bookId: payload.bookId, isCached })
    }

    if (type === 'DELETE_BOOK_CACHE') {
        await deleteBookCache(payload.bookId)
        event.source.postMessage({ type: 'BOOK_CACHE_DELETED', bookId: payload.bookId })
    }
})

// ─── Download Book for Offline ────────────────────────────────────────────────
async function downloadBookForOffline(bookId, client) {
    try {
        client.postMessage({ type: 'DOWNLOAD_PROGRESS', bookId, status: 'fetching', progress: 5 })

        // Step 1: Pre-cache the offline pages HTML + JS by visiting them
        // This forces Next.js to send us the page HTML and all its JS chunks
        const pagesToCache = [
            `${self.location.origin}/offline`,
            `${self.location.origin}/offline/book/${bookId}`,
        ]

        const staticCache = await caches.open(STATIC_CACHE)
        const shellCache = await caches.open(APP_SHELL_CACHE)

        for (const pageUrl of pagesToCache) {
            try {
                const resp = await fetch(pageUrl, { credentials: 'include' })
                if (resp.ok) {
                    await shellCache.put(pageUrl, resp)
                }
            } catch (e) {
                console.warn('[SW] Could not pre-cache page:', pageUrl, e)
            }
        }

        client.postMessage({ type: 'DOWNLOAD_PROGRESS', bookId, status: 'fetching', progress: 15 })

        // Step 2: Fetch all book data from API
        const apiUrl = `${self.location.origin}/api/book/${bookId}/offline`
        const response = await fetch(apiUrl, { credentials: 'include' })

        if (!response.ok) {
            throw new Error(`Failed to fetch book data: ${response.status}`)
        }

        const bookData = await response.json()
        client.postMessage({ type: 'DOWNLOAD_PROGRESS', bookId, status: 'caching', progress: 30 })

        const booksCache = await caches.open(BOOKS_CACHE)
        const total = bookData.questions.length
        let cached = 0

        // Step 3: Cache each question's JSON data
        for (const question of bookData.questions) {
            if (!question.qr_slug) continue

            const questionDataUrl = `${self.location.origin}/__offline_data__/q/${question.qr_slug}`

            const questionResponse = new Response(JSON.stringify({
                ...question,
                _cached_book: bookData.book,
                _cached_topics: bookData.topics,
            }), {
                headers: { 'Content-Type': 'application/json', 'X-Offline-Cached': 'true' }
            })

            await booksCache.put(questionDataUrl, questionResponse)
            cached++

            // Also pre-cache the offline question page for the first few questions
            // (to warm up more JS chunks)
            if (cached <= 2) {
                try {
                    const qPageUrl = `${self.location.origin}/offline/q/${question.qr_slug}`
                    const qPageResp = await fetch(qPageUrl, { credentials: 'include' })
                    if (qPageResp.ok) {
                        await shellCache.put(qPageUrl, qPageResp)
                    }
                } catch { /* non-critical */ }
            }

            const progress = 30 + Math.floor((cached / total) * 60)
            if (cached % 5 === 0 || cached === total) {
                client.postMessage({ type: 'DOWNLOAD_PROGRESS', bookId, status: 'caching', progress })
            }
        }

        // Step 4: Store the book index data
        const bookIndexResponse = new Response(JSON.stringify(bookData), {
            headers: { 'Content-Type': 'application/json', 'X-Offline-Cached': 'true' }
        })
        await booksCache.put(`${self.location.origin}/__offline_data__/book/${bookId}`, bookIndexResponse)

        // Step 5: Crawl the offline page to pre-cache any remaining JS chunks
        // By fetching the built page, its JS chunk requests will pass through the SW
        // and get cached by cacheFirstImmutable()
        try {
            const offlineIndexResp = await fetch(`${self.location.origin}/offline`, { credentials: 'include' })
            if (offlineIndexResp.ok) {
                await shellCache.put(`${self.location.origin}/offline`, offlineIndexResp)
            }
        } catch { /* non-critical */ }

        client.postMessage({
            type: 'DOWNLOAD_COMPLETE',
            bookId,
            status: 'done',
            progress: 100,
            questionCount: total
        })
    } catch (error) {
        client.postMessage({
            type: 'DOWNLOAD_ERROR',
            bookId,
            error: error.message || 'Download failed'
        })
    }
}

// ─── Check if book is cached ──────────────────────────────────────────────────
async function isBookCached(bookId) {
    const cacheNames = await caches.keys()
    for (const name of cacheNames) {
        if (!name.startsWith('quiz-books-')) continue
        const cache = await caches.open(name)
        const response = await cache.match(`${self.location.origin}/__offline_data__/book/${bookId}`)
        if (response) return true
    }
    return false
}

// ─── Delete book from cache ───────────────────────────────────────────────────
async function deleteBookCache(bookId) {
    const cacheNames = await caches.keys()
    for (const name of cacheNames) {
        if (!name.startsWith('quiz-books-')) continue
        const cache = await caches.open(name)
        const bookResponse = await cache.match(`${self.location.origin}/__offline_data__/book/${bookId}`)
        if (bookResponse) {
            const bookData = await bookResponse.json()
            for (const question of bookData.questions || []) {
                if (question.qr_slug) {
                    await cache.delete(`${self.location.origin}/__offline_data__/q/${question.qr_slug}`)
                }
            }
            await cache.delete(`${self.location.origin}/__offline_data__/book/${bookId}`)
        }
    }
}
