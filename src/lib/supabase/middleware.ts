import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    // 1. Create a basic response
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // 2. Initialize Supabase client
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
                    response = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 3. Refresh session by calling getUser
    // IMPORTANT: Avoid calling getUser() on completely public asset routes to save DB calls
    const { pathname } = request.nextUrl
    const isAsset = pathname.includes('.') || pathname.startsWith('/_next') || pathname.startsWith('/api/')

    if (!isAsset) {
        await supabase.auth.getUser()
    }

    // 4. Check for the persistent access code cookie
    const accessCode = request.cookies.get('student-access-code')?.value;

    // 5. Protection Logic
    // Allow anonymous access to dashboard and book listings.
    // Protection (checking if book is free or code matches) happens inside page components.

    if (accessCode && pathname === '/login') {
        // Already has access and trying to reach login -> Redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Cache hardening for sensitive routes
    const isSensitivePath = pathname === '/dashboard' ||
        pathname === '/login' ||
        pathname === '/redeem' ||
        pathname.startsWith('/q/') ||
        pathname.startsWith('/book/');

    if (isSensitivePath) {
        response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    }

    return response;
}
