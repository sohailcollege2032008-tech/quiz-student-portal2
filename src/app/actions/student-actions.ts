'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/**
 * Toggles a question in the student's review list.
 * This requires the user to be authenticated (even anonymously).
 */
export async function toggleReviewQuestion(questionId: string) {
    try {
        const adminSupabase = createAdminClient()

        // 1. Get current user using proper server client
        const supabaseServer = await createClient()
        const { data: { user } } = await supabaseServer.auth.getUser()

        if (!user) {
            return { error: 'You must be signed in to save questions to your review list.' }
        }

        // 2. Check if already exists
        const { data: existing } = await adminSupabase
            .from('review_list')
            .select('id')
            .eq('user_id', user.id)
            .eq('question_id', questionId)
            .single()

        if (existing) {
            // Remove
            const { error: deleteError } = await adminSupabase
                .from('review_list')
                .delete()
                .eq('id', existing.id)

            if (deleteError) throw deleteError
            revalidatePath(`/q/${questionId}`)
            return { success: true, action: 'removed' }
        } else {
            // Add
            const { error: insertError } = await adminSupabase
                .from('review_list')
                .insert({
                    user_id: user.id,
                    question_id: questionId
                })

            if (insertError) throw insertError
            revalidatePath(`/q/${questionId}`)
            return { success: true, action: 'added' }
        }
    } catch (err: any) {
        console.error('Toggle Review Error:', err)
        return { error: err.message || 'Failed to update review list' }
    }
}

/**
 * Fetches the review list status for a specific question.
 */
export async function getReviewStatus(questionId: string) {
    const adminSupabase = createAdminClient()
    const supabaseServer = await createClient()
    const { data: { user } } = await supabaseServer.auth.getUser()

    if (!user) return false

    const { data } = await adminSupabase
        .from('review_list')
        .select('id')
        .eq('user_id', user.id)
        .eq('question_id', questionId)
        .single()

    return !!data
}
