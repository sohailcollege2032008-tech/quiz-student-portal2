import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        // Log Error but don't crash the whole process
        console.error('CRITICAL: Supabase environment variables are missing');
        // Return a mock that throws descriptive errors on use
        return createServerClient('http://invalid', 'invalid', { cookies: { getAll: () => [], setAll: () => { } } });
    }

    return createServerClient(
        supabaseUrl,
        supabaseAnonKey,
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
                                maxAge: options?.maxAge === 0 ? 0 : 315360000, // 10 years or delete
                                sameSite: 'lax',
                                path: '/',
                                secure: process.env.NODE_ENV === 'production',
                            })
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
