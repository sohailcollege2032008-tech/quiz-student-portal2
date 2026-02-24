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
                    // Update Request for downstream
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

                    // Update Response
                    supabaseResponse = NextResponse.next({
                        request,
                    })

                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, {
                            ...options,
                            maxAge: 315360000, // 10 years
                            sameSite: 'lax',
                            path: '/',
                            secure: process.env.NODE_ENV === 'production',
                        })
                    )
                },
            },
        }
    )

    // IMPORTANT: Refresh auth token
    await supabase.auth.getUser()

    // HARDEN: Proactively promote ALL existing auth cookies in the request 
    // to "Eternal" status in the response if they aren't already being updated.
    const allAuthCookies = request.cookies.getAll().filter(c => c.name.startsWith('sb-'));
    allAuthCookies.forEach(cookie => {
        if (!supabaseResponse.cookies.get(cookie.name)) {
            supabaseResponse.cookies.set(cookie.name, cookie.value, {
                maxAge: 315360000,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            });
        }
    });

    // CACHE HARDENING: Prevent In-App browsers from caching stale login states
    const path = request.nextUrl.pathname;
    if (path.startsWith('/q/') || path.startsWith('/book/') || path === '/login' || path === '/dashboard') {
        supabaseResponse.headers.set('Cache-Control', 'no-store, max-age=0');
    }

    return supabaseResponse
}
