import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, {
                            ...options,
                            maxAge: 315360000, // 10 years in seconds
                            sameSite: 'lax',   // Robust for app-to-browser cross-navigation
                            path: '/',
                            secure: process.env.NODE_ENV === 'production',
                        })
                    )
                },
            },
        }
    )

    // IMPORTANT: Do not remove this call!
    // This is required to refresh the auth token if it's expired.
    await supabase.auth.getUser()

    // -------------------------------------------------------------------------
    // AGGRESSIVE COOKIE PROMOTION (ETERNAL SESSION)
    // -------------------------------------------------------------------------
    // We search for any Supabase auth cookies in the request and proactively
    // promote them to 10-year "Eternal" cookies in the response.
    // This handles cases where the client library might set a session-only cookie.
    const authCookies = request.cookies.getAll().filter(c => c.name.startsWith('sb-'));
    authCookies.forEach(cookie => {
        supabaseResponse.cookies.set(cookie.name, cookie.value, {
            maxAge: 315360000, // 10 years
            sameSite: 'lax',
            path: '/',
            secure: process.env.NODE_ENV === 'production',
        });
    });

    return supabaseResponse
}
