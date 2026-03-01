import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: bookId } = await params

    const cookieStore = await cookies()
    const accessCookie = cookieStore.get('student-access-code')?.value || ''
    const accessCodes = accessCookie.split(',').filter((c) => c.trim().length > 0)

    const supabase = createAdminClient()
    const supabaseServer = await createClient()
    const { data: { user } } = await supabaseServer.auth.getUser()

    // 1. Fetch Book info
    const { data: book } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single()

    if (!book) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // 2. Access Check (same logic as book page)
    let hasAccess = book.is_free === true

    if (!hasAccess && accessCodes.length > 0) {
        const { data: accessData } = await supabase
            .from('access_codes')
            .select('id')
            .in('code', accessCodes)
            .eq('book_id', bookId)
            .maybeSingle()
        if (accessData) hasAccess = true
    }

    if (!hasAccess && user) {
        const { data: userActivation } = await supabase
            .from('user_book_activations')
            .select('id')
            .eq('user_id', user.id)
            .eq('book_id', bookId)
            .maybeSingle()
        if (userActivation) hasAccess = true
    }

    if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // 3. Fetch Topics
    const { data: topics } = await supabase
        .from('topics')
        .select('id, title, created_at')
        .eq('book_id', bookId)
        .order('created_at', { ascending: true })

    // 4. Fetch ALL Questions with full content (for offline storage)
    const { data: questions } = await supabase
        .from('questions')
        .select('id, question_text, qr_slug, topic_id, type, content_json, created_at')
        .eq('book_id', bookId)
        .order('created_at', { ascending: true })

    return NextResponse.json(
        {
            book: {
                id: book.id,
                title: book.title,
                description: book.description,
                is_free: book.is_free,
            },
            topics: topics || [],
            questions: questions || [],
            cached_at: new Date().toISOString(),
        },
        {
            headers: {
                // Cache for 1 hour on the CDN edge but allow revalidation
                'Cache-Control': 'private, max-age=3600, must-revalidate',
            },
        }
    )
}
