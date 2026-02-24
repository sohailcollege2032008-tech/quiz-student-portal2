import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    // 1. Check for the persistent access code cookie
    const accessCode = request.cookies.get('student-access-code')?.value;
    const { pathname } = request.nextUrl;

    // 2. Define Public Routes
    const isPublicRoute = pathname === '/' || pathname === '/login' || pathname === '/redeem';
    const isAsset = pathname.includes('.') || pathname.startsWith('/_next') || pathname.startsWith('/api/');

    // 3. Create a basic response
    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    // 4. Protection Logic
    if (!accessCode && !isPublicRoute && !isAsset) {
        // No access code and trying to reach a protected page -> Redirect to login
        return NextResponse.redirect(new URL('/login', request.url));
    }

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
