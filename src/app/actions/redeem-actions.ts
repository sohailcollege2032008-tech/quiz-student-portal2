'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function redeemCodeAction(code: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'You must be logged in to redeem a code.' }
    }

    const adminSupabase = createAdminClient()

    // 1. Check if the code exists and is not used
    const { data: accessCode, error: fetchError } = await adminSupabase
        .from('access_codes')
        .select('*, books(title)')
        .eq('code', code.trim())
        .single()

    if (fetchError || !accessCode) {
        return { error: 'Invalid or expired access code.' }
    }

    if (accessCode.is_used) {
        return { error: 'This code has already been redeemed.' }
    }

    // 2. Mark code as used and link to user
    const { error: updateError } = await adminSupabase
        .from('access_codes')
        .update({
            is_used: true,
            used_by_user_id: user.id
        })
        .eq('id', accessCode.id)

    if (updateError) {
        return { error: 'Failed to activate code. Please try again.' }
    }

    // 3. Create activation record
    const { error: activationError } = await adminSupabase
        .from('user_book_activations')
        .insert({
            user_id: user.id,
            book_id: accessCode.book_id
        })

    if (activationError) {
        console.error('Activation record error:', activationError)
    }

    revalidatePath('/dashboard')

    return {
        success: true,
        message: `Successfully activated: ${accessCode.books?.title || 'New Book'}`
    }
}
