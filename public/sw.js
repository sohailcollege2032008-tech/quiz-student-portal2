// Service Worker for Quiz Engine - Offline Book Support
// Version: 2.0 — Fixed offline redirect logic
const CACHE_VERSION = 'v2'
const APP_SHELL_CACHE = `quiz-shell-${CACHE_VERSION}`
const BOOKS_CACHE = `quiz-books-${CACHE_VERSION}`

// Core app shell files to pre-cache on install
const APP_SHELL_URLS = [
    '/offline',
]

// ─── Install: Cache app shell ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_SHELL_CACHE).then(async (cache) => {
            // Try to cache offline page - don't block install if it fails
            try {
                await cache.add('/offline')
            } catch (e) {
                console.warn('[SW] Could not pre-cache /offline:', e)
            }
        }).then(() => self.skipWaiting())
    )
})

// ─── Activate: Clean up old caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => {
                        // Delete old version caches
                        return (name.startsWith('quiz-shell-') && name !== APP_SHELL_CACHE) ||
                            (name.startsWith('quiz-books-') && name !== BOOKS_CACHE)
                    })
                    .map((name) => caches.delete(name))
            )
        }).then(() => self.clients.claim())
    )
})

// ─── Fetch: Intercept requests ────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event
    const url = new URL(request.url)

    // Skip non-GET requests
    if (request.method !== 'GET') return

    // Skip non-same-origin requests (Supabase, CDN, etc.)
    if (url.origin !== self.location.origin) return

    // Skip Next.js internal routes
    if (url.pathname.startsWith('/_next/')) return

    // Skip all API routes EXCEPT our own offline API
    if (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/book/')) return

    // ── Question pages: /q/[slug] ──────────────────────────────────────────
    // These are SSR pages — offline we redirect to the /offline/q/[slug] equivalents
    if (url.pathname.startsWith('/q/')) {
        event.respondWith(handleQuestionRequest(request, url))
        return
    }

    // ── Offline pages already: serve from cache ────────────────────────────
    if (url.pathname.startsWith('/offline')) {
        event.respondWith(cacheFirstStrategy(request, APP_SHELL_CACHE))
        return
    }

    // ── API book offline endpoint: cache the response ──────────────────────
    if (url.pathname.startsWith('/api/book/') && url.pathname.endsWith('/offline')) {
        event.respondWith(networkFirstStrategy(request, APP_SHELL_CACHE))
        return
    }

    // ── Everything else: network first ────────────────────────────────────
    event.respondWith(networkFirstStrategy(request, APP_SHELL_CACHE))
})

// ─── Handle /q/[slug] Requests ───────────────────────────────────────────────
// If online → pass through to server (normal SSR)
// If offline → redirect to /offline/q/[slug] which reads from cache
async function handleQuestionRequest(request, url) {
    try {
        // Try network first (normal online flow)
        const response = await fetch(request)
        return response
    } catch {
        // Network failed → we are offline
        // Extract the slug from /q/[slug]
        const slug = url.pathname.replace('/q/', '')

        // Redirect to offline question page
        const offlineUrl = new URL(`/offline/q/${slug}`, self.location.origin)
        return Response.redirect(offlineUrl.href, 302)
    }
}

// ─── Cache-First Strategy ─────────────────────────────────────────────────────
async function cacheFirstStrategy(request, cacheName) {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(request)

    if (cached) {
        return cached
    }

    try {
        const response = await fetch(request)
        if (response.ok) {
            cache.put(request, response.clone())
        }
        return response
    } catch {
        // Return offline fallback
        const offlinePage = await caches.match('/offline')
        return offlinePage || new Response('You are offline.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
        })
    }
}

// ─── Network-First Strategy ───────────────────────────────────────────────────
async function networkFirstStrategy(request, cacheName) {
    try {
        const response = await fetch(request)
        if (response.ok) {
            const cache = await caches.open(cacheName)
            cache.put(request, response.clone())
        }
        return response
    } catch {
        const cached = await caches.match(request)
        if (cached) return cached
        const offlinePage = await caches.match('/offline')
        return offlinePage || new Response('You are offline.', { status: 503 })
    }
}

// ─── Message Handler ──────────────────────────────────────────────────────────
self.addEventListener('message', async (event) => {
    if (!event.data) return

    if (event.data.type === 'DOWNLOAD_BOOK') {
        const { bookId } = event.data.payload
        await downloadBookForOffline(bookId, event.source)
    }

    if (event.data.type === 'CHECK_BOOK_CACHED') {
        const { bookId } = event.data.payload
        const isCached = await isBookCached(bookId)
        event.source.postMessage({ type: 'BOOK_CACHE_STATUS', bookId, isCached })
    }

    if (event.data.type === 'DELETE_BOOK_CACHE') {
        const { bookId } = event.data.payload
        await deleteBookCache(bookId)
        event.source.postMessage({ type: 'BOOK_CACHE_DELETED', bookId })
    }
})

// ─── Download Book for Offline ────────────────────────────────────────────────
async function downloadBookForOffline(bookId, client) {
    try {
        client.postMessage({ type: 'DOWNLOAD_PROGRESS', bookId, status: 'fetching', progress: 10 })

        const apiUrl = `${self.location.origin}/api/book/${bookId}/offline`
        const response = await fetch(apiUrl, { credentials: 'include' })

        if (!response.ok) {
            throw new Error(`Failed to fetch book data: ${response.status}`)
        }

        const bookData = await response.json()
        client.postMessage({ type: 'DOWNLOAD_PROGRESS', bookId, status: 'caching', progress: 50 })

        const cache = await caches.open(BOOKS_CACHE)
        const total = bookData.questions.length
        let cached = 0

        // Cache each question's data for the offline question page
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

            await cache.put(questionDataUrl, questionResponse)

            cached++
            const progress = 50 + Math.floor((cached / total) * 45)
            client.postMessage({ type: 'DOWNLOAD_PROGRESS', bookId, status: 'caching', progress })
        }

        // Store the book index data
        const bookIndexResponse = new Response(JSON.stringify(bookData), {
            headers: { 'Content-Type': 'application/json', 'X-Offline-Cached': 'true' }
        })
        await cache.put(`${self.location.origin}/__offline_data__/book/${bookId}`, bookIndexResponse)

        // Also cache the offline question pages (HTML shell)
        try {
            const offlineBookPage = await fetch(`${self.location.origin}/offline/book/${bookId}`, { credentials: 'include' })
            if (offlineBookPage.ok) {
                await cache.put(`${self.location.origin}/offline/book/${bookId}`, offlineBookPage)
            }
        } catch {
            // Not critical — page can render from JS
        }

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
    const cache = await caches.open(BOOKS_CACHE)
    const response = await cache.match(`${self.location.origin}/__offline_data__/book/${bookId}`)
    return !!response
}

// ─── Delete book from cache ───────────────────────────────────────────────────
async function deleteBookCache(bookId) {
    const cache = await caches.open(BOOKS_CACHE)

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
