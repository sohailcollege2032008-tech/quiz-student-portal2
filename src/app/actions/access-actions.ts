'use server'

import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Verifies a redemption code and sets a persistent 10-year cookie.
 * This replaces traditional email/password authentication.
 */
export async function verifyAccessCode(code: string) {
    if (!code || code.length < 4) {
        return { error: 'Please enter a valid code' }
    }

    try {
        const supabase = createAdminClient()

        // 1. Check if the code exists in the access_codes table
        const { data: accessCode, error } = await supabase
            .from('access_codes')
            .select('*, books(*)')
            .eq('code', code.trim())
            .single()

        if (error || !accessCode) {
            return { error: 'Invalid or expired access code' }
        }

        // 2. Mark as used if it's the first time
        if (!accessCode.is_used) {
            await supabase
                .from('access_codes')
                .update({ is_used: true })
                .eq('id', accessCode.id)
        }

        // 3. Set the 10-year access cookie
        const cookieStore = await cookies()
        cookieStore.set('student-access-code', code.trim(), {
            maxAge: 315360000, // 10 years
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
        })

        return { success: true }
    } catch (err: any) {
        console.error('Access verification error:', err)
        return { error: 'Failed to verify code. Please try again.' }
    }
}

/**
 * Removes the access cookie.
 */
export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete('student-access-code')
    return { success: true }
}
