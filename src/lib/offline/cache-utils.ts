/**
 * Searches for a cached response across ALL quiz-* caches.
 * This avoids cache version mismatch between sw.js and the offline pages.
 */
export async function matchFromBooksCache(url: string): Promise<Response | null> {
    if (!('caches' in window)) return null

    const cacheNames = await caches.keys()
    // Search all quiz- caches (books, static, shell) for the data
    const quizCaches = cacheNames.filter((name) => name.startsWith('quiz-'))

    for (const cacheName of quizCaches) {
        const cache = await caches.open(cacheName)
        const response = await cache.match(url)
        if (response) return response
    }

    return null
}
