'use client'

import { useEffect } from 'react'

/**
 * Registers the Service Worker globally for the app.
 * Placed in the root layout so it activates on first visit.
 */
export default function ServiceWorkerProvider() {
    useEffect(() => {
        if (typeof window === 'undefined') return
        if (!('serviceWorker' in navigator)) return

        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then((reg) => {
                // Check for updates periodically
                reg.update().catch(() => { })
            })
            .catch((err) => {
                console.warn('Service Worker registration failed:', err)
            })
    }, [])

    return null // This component renders nothing
}
