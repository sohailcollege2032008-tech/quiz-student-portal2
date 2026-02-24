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
                    // Update Request for downstream (Server Components)
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

                    // Update Response for browser
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
    const { data: { user } } = await supabase.auth.getUser()

    // HARDEN: Only promote cookies if we have a valid authenticated user.
    // AND: Avoid resurrecting deleted cookies (those with maxAge: 0).
    const allAuthCookies = request.cookies.getAll().filter(c => c.name.startsWith('sb-'));

    allAuthCookies.forEach(cookie => {
        const responseCookie = supabaseResponse.cookies.get(cookie.name);

        // If the cookie is marked for deletion in the response, do NOT promote it.
        const isBeingDeleted = responseCookie?.maxAge === 0;

        if (user && !isBeingDeleted && !responseCookie) {
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
    const isSensitivePath = path === '/dashboard' ||
        path === '/login' ||
        path === '/redeem' ||
        path.startsWith('/q/') ||
        path.startsWith('/book/');

    if (isSensitivePath) {
        supabaseResponse.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    }

    return supabaseResponse
}
