import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Safety check: Avoid crashing the whole site if env vars are missing in Edge Runtime
    if (!supabaseUrl || !supabaseAnonKey) {
        return supabaseResponse;
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                // Update Request for downstream (Server Components)
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

                // Update Response for browser - Force 10-year persistence EXCEPT for deletions
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, {
                        ...options,
                        maxAge: options?.maxAge === 0 ? 0 : 315360000, // 10 years or delete
                        sameSite: 'lax',
                        path: '/',
                        secure: process.env.NODE_ENV === 'production',
                    })
                );
            },
        },
    });

    // -------------------------------------------------------------------------
    // SURGICAL FIX: REFRESH THROTTLING & TOKEN PROTECTION
    // -------------------------------------------------------------------------
    const refreshLock = request.cookies.get('sb-refresh-lock');
    let user = null;

    try {
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
    } catch (e) {
        console.error('Middleware Auth Error:', e);
    }

    // HARDEN: Aggressively promote ALL auth cookies to 10 years
    // CRITICAL: Only set if the cookie ISN'T already in the response to avoid overwriting fresh tokens.
    const allAuthCookies = request.cookies.getAll().filter(c => c.name.startsWith('sb-'));
    allAuthCookies.forEach(cookie => {
        const responseCookie = supabaseResponse.cookies.get(cookie.name);
        // Supabase sets maxAge: 0 to delete a cookie
        const isBeingDeleted = responseCookie && responseCookie.maxAge === 0;

        // ONLY promote if we have a user and supabase didn't already set/refresh/delete this cookie in the current response
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
