import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for use in Server Components, Server Actions, and Route Handlers.
 * This client reads and writes cookies to maintain user sessions.
 */
export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, {
                                ...options,
                                maxAge: options?.maxAge ?? 315360000, // Default 10 years
                            })
                        )
                    } catch {
                        // setAll is called from Server Components where write is not possible.
                        // This can be safely ignored — the middleware will refresh the session.
                    }
                },
            },
        }
    )
}
