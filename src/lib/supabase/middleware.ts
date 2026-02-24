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

    // -------------------------------------------------------------------------
    // SURGICAL FIX: REFRESH THROTTLING & TOKEN PROTECTION
    // -------------------------------------------------------------------------
    const refreshLock = request.cookies.get('sb-refresh-lock');
    let user = null;

    // Check if we have a valid session in cookies without rotating tokens
    const { data: { session } } = await supabase.auth.getSession();

    // Only trust the lock if we actually FOUND a valid session
    if (refreshLock && session?.user) {
        user = session.user;
    } else {
        // No lock OR no valid session found -> Perform a real refresh
        const { data } = await supabase.auth.getUser();
        user = data.user;

        if (user) {
            // Success! Set a 30-second lock to prevent racing rotations
            supabaseResponse.cookies.set('sb-refresh-lock', 'true', {
                maxAge: 30,
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
            });
        }
    }

    // HARDEN: Aggressively promote ALL auth cookies to 10 years
    // CRITICAL: Only set if the cookie ISN'T already in the response to avoid overwriting fresh tokens.
    const allAuthCookies = request.cookies.getAll().filter(c => c.name.startsWith('sb-'));
    allAuthCookies.forEach(cookie => {
        const responseCookie = supabaseResponse.cookies.get(cookie.name);
        const isBeingDeleted = responseCookie?.maxAge === 0;

        // ONLY promote if we have a user and supabase didn't already set this cookie in the response
        if (user && !isBeingDeleted && !responseCookie) {
            supabaseResponse.cookies.set(cookie.name, cookie.value, {
                maxAge: 315360000, // 10 years
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
