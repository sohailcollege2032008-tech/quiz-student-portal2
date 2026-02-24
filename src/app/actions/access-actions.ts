'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
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
        console.log('--- Access Verification Start ---');
        console.log('Code being verified:', code);
        
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        console.log('NEXT_PUBLIC_SUPABASE_URL present:', !!supabaseUrl);
        console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!serviceRoleKey);

        const supabase = createAdminClient()

        // 1. Check if the code exists in the access_codes table
        const { data: accessCode, error } = await supabase
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
            const { error: updateError } = await supabase
                .from('access_codes')
                .update({ is_used: true })
                .eq('id', accessCode.id)
            
            if (updateError) {
                console.error('Error updating access code:', updateError);
            }
        }

        // 3. Set the 10-year access cookie
        console.log('Setting persistent cookie...');
        const cookieStore = await cookies()
        cookieStore.set('student-access-code', code.trim(), {
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
 * Removes the access cookie.
 */
export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete('student-access-code')
    redirect('/login')
}
