/**
 * Searches for a cached response across ALL quiz-books-* caches.
 * This avoids cache version mismatch between sw.js and the offline pages.
 */
export async function matchFromBooksCache(url: string): Promise<Response | null> {
    if (!('caches' in window)) return null

    const cacheNames = await caches.keys()
    const bookCaches = cacheNames.filter((name) => name.startsWith('quiz-books-'))

    for (const cacheName of bookCaches) {
        const cache = await caches.open(cacheName)
        const response = await cache.match(url)
        if (response) return response
    }

    return null
}
