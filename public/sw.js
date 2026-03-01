// Service Worker for Quiz Engine - Offline Book Support
// Version: 1.0
const CACHE_VERSION = 'v1'
const APP_SHELL_CACHE = `quiz-shell-${CACHE_VERSION}`
const BOOKS_CACHE = `quiz-books-${CACHE_VERSION}`

// Core app shell files to cache immediately on install
const APP_SHELL_URLS = [
    '/',
    '/dashboard',
    '/offline',
]

// ─── Install: Cache app shell ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_SHELL_CACHE).then((cache) => {
            return cache.addAll(APP_SHELL_URLS).catch(() => {
                // Silently fail for individual URLs - don't block install
            })
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
                        return name.startsWith('quiz-') &&
                            name !== APP_SHELL_CACHE &&
                            name !== BOOKS_CACHE
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

    // Skip non-GET requests and non-same-origin
    if (request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
        return
    }

    // Skip Supabase API requests - these should never be cached
    if (url.hostname.includes('supabase')) {
        return
    }

    // Skip Next.js internal routes and API routes (except our offline API)
    if (url.pathname.startsWith('/_next/') ||
        (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/book/'))) {
        return
    }

    // For question pages (/q/[slug]) → Cache-First strategy (works offline)
    if (url.pathname.startsWith('/q/')) {
        event.respondWith(cacheFirstStrategy(request, BOOKS_CACHE))
        return
    }

    // For book pages (/book/[id]) → Cache-First strategy
    if (url.pathname.startsWith('/book/')) {
        event.respondWith(cacheFirstStrategy(request, BOOKS_CACHE))
        return
    }

    // For everything else → Network-First (try server, fallback to cache)
    event.respondWith(networkFirstStrategy(request))
})

// ─── Cache-First Strategy ─────────────────────────────────────────────────────
async function cacheFirstStrategy(request, cacheName) {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(request)

    if (cached) {
        return cached
    }

    // Not in cache, try network
    try {
        const response = await fetch(request)
        if (response.ok) {
            cache.put(request, response.clone())
        }
        return response
    } catch {
        // Return offline page if we can't fetch
        const offlinePage = await caches.match('/offline')
        return offlinePage || new Response('You are offline and this content is not cached.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
        })
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
        const cached = await caches.match(request)
        if (cached) return cached
        const offlinePage = await caches.match('/offline')
        return offlinePage || new Response('Offline', { status: 503 })
    }
}

// ─── Message Handler: Download Book ──────────────────────────────────────────
self.addEventListener('message', async (event) => {
    if (!event.data) return

    if (event.data.type === 'DOWNLOAD_BOOK') {
        const { bookId, accessToken } = event.data.payload
        await downloadBookForOffline(bookId, accessToken, event.source)
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
async function downloadBookForOffline(bookId, accessToken, client) {
    try {
        client.postMessage({ type: 'DOWNLOAD_PROGRESS', bookId, status: 'fetching', progress: 10 })

        // Fetch all book data in one request
        const headers = {}
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

        const apiUrl = `/api/book/${bookId}/offline`
        const response = await fetch(apiUrl, { headers, credentials: 'include' })

        if (!response.ok) {
            throw new Error(`Failed to fetch book data: ${response.status}`)
        }

        const bookData = await response.json()
        client.postMessage({ type: 'DOWNLOAD_PROGRESS', bookId, status: 'caching', progress: 50 })

        const cache = await caches.open(BOOKS_CACHE)
        const total = bookData.questions.length
        let cached = 0

        // Cache each question page by creating a synthetic response
        for (const question of bookData.questions) {
            if (!question.qr_slug) continue

            // Store the question data as a JSON response, keyed by its QR slug URL
            const questionUrl = `${self.location.origin}/q/${question.qr_slug}`
            const questionDataUrl = `${self.location.origin}/__offline_data__/q/${question.qr_slug}`

            // Store the raw question JSON for client-side rendering
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

        // Also store the book index data
        const bookIndexResponse = new Response(JSON.stringify(bookData), {
            headers: { 'Content-Type': 'application/json', 'X-Offline-Cached': 'true' }
        })
        await cache.put(`${self.location.origin}/__offline_data__/book/${bookId}`, bookIndexResponse)

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

    // Get book data to find all question slugs
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
