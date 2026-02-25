'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Verifies a redemption code and links it to the current Supabase session.
 * This establishes ownership of the book for the authenticated user.
 */
export async function verifyAccessCode(code: string) {
    if (!code || code.length < 4) {
        return { error: 'Please enter a valid code' }
    }

    try {
        console.log('--- Access Verification Start ---');
        console.log('Code being verified:', code);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        console.log('NEXT_PUBLIC_SUPABASE_URL present:', !!supabaseUrl);
        console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!serviceRoleKey);

        // 0. Get the current authenticated user using the server client
        const supabaseServer = await createClient()
        const { data: { user } } = await supabaseServer.auth.getUser()

        // Admin client for DB operations
        const adminSupabase = createAdminClient()

        // 1. Check if the code exists in the access_codes table
        const { data: accessCode, error } = await adminSupabase
            .from('access_codes')
            .select('*, books(*)')
            .eq('code', code.trim())
            .single()

        if (error || !accessCode) {
            console.error('Database query error or no code found:', error);
            return { error: 'Invalid or expired access code' }
        }

        console.log('Access code found:', accessCode.id);

        // 2. Mark as used if it's the first time
        if (!accessCode.is_used) {
            console.log('Marking code as used...');
            const { error: updateError } = await adminSupabase
                .from('access_codes')
                .update({ is_used: true })
                .eq('id', accessCode.id)

            if (updateError) {
                console.error('Error updating access code:', updateError);
            }
        }

        // 3. Link the book to the user in user_book_activations (Only if logged in)
        if (user) {
            console.log('Linking book to user id:', user.id);
            const { error: activationError } = await adminSupabase
                .from('user_book_activations')
                .upsert({
                    user_id: user.id,
                    book_id: accessCode.book_id,
                    code_id: accessCode.id
                }, { onConflict: 'user_id, book_id' })

            if (activationError) {
                console.error('Failed to link book:', activationError)
            }
        }

        // 4. Set/Update the 10-year access cookie (Maintain for hybrid access logic)
        console.log('Setting persistent cookie...');

        const cookieStore = await cookies()
        const existingCookie = cookieStore.get('student-access-code')?.value

        let newCookieValue = code.trim();
        if (existingCookie) {
            const codes = existingCookie.split(',').filter(c => c.trim().length > 0);
            if (!codes.includes(code.trim())) {
                codes.push(code.trim());
                newCookieValue = codes.join(',');
            }
        }

        cookieStore.set('student-access-code', newCookieValue, {
            maxAge: 315360000, // 10 years
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
        })

        console.log('Verification successful!');
        return { success: true }
    } catch (err: any) {
        console.error('--- Access Verification Exception ---');
        console.error('Error Message:', err.message);
        console.error('Error Stack:', err.stack);

        return {
            error: `Failed to verify code. Error: ${err.message || 'Unknown error'}`

        }
    }
}

/**
 * Removes the access cookie and signs out of Supabase.
 */
export async function logout() {
    const cookieStore = await cookies()
    const supabase = createAdminClient()

    // Sign out of Supabase session
    await supabase.auth.signOut()

    // Clear cookies
    cookieStore.delete('student-access-code')
    cookieStore.delete('student-name')

    redirect('/login')
}

/**
 * Links all codes found in the 'student-access-code' cookie to the currently authenticated user.
 * This should be called after a successful login or signup.
 */
export async function linkAccessCodes() {
    try {
        const supabaseServer = await createClient()
        const { data: { user } } = await supabaseServer.auth.getUser()
        if (!user) return { error: 'Not authenticated' }

        const adminSupabase = createAdminClient()
        const cookieStore = await cookies()
        const existingCookie = cookieStore.get('student-access-code')?.value
        if (!existingCookie) return { success: true, message: 'No codes to link' }

        const codes = existingCookie.split(',').filter(c => c.trim().length > 0)
        let linkedCount = 0

        for (const code of codes) {
            // Find the book associated with this code
            const { data: accessCode } = await adminSupabase
                .from('access_codes')
                .select('id, book_id')
                .eq('code', code.trim())
                .single()

            if (accessCode) {
                const { error: linkError } = await adminSupabase
                    .from('user_book_activations')
                    .upsert({
                        user_id: user.id,
                        book_id: accessCode.book_id,
                        code_id: accessCode.id
                    }, { onConflict: 'user_id, book_id' })

                if (!linkError) linkedCount++
            }
        }

        return { success: true, linkedCount }
    } catch (err: any) {
        console.error('Error linking access codes:', err)
        return { error: err.message }
    }
}
