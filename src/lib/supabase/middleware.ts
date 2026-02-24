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
    // ETENRAL SESSION ENFORCEMENT (FIXED)
    // -------------------------------------------------------------------------
    // Promote ALL Supabase auth cookies in the response to 10-year lifespan.
    // We check the request cookies, and if they are not already in the response 
    // (meaning Supabase didn't just refresh them), we add them to the response with 
    // the eternal settings.
    const allReqCookies = request.cookies.getAll().filter(c => c.name.startsWith('sb-'));

    allReqCookies.forEach(reqCookie => {
        // Only promote if Supabase hasn't already set a new value in the response
        if (!supabaseResponse.cookies.get(reqCookie.name)) {
            supabaseResponse.cookies.set(reqCookie.name, reqCookie.value, {
                maxAge: 315360000, // 10 years
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            });
        }
    });

    return supabaseResponse
}
