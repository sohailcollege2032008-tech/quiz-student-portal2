'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleReviewListItem(questionId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    // Check if it's already in the review list
    const { data: existing } = await supabase
        .from('review_list')
        .select('id')
        .eq('user_id', user.id)
        .eq('question_id', questionId)
        .single()

    if (existing) {
        // Remove it
        await supabase
            .from('review_list')
            .delete()
            .eq('id', existing.id)
    } else {
        // Add it
        await supabase
            .from('review_list')
            .insert({
                user_id: user.id,
                question_id: questionId
            })
    }

    revalidatePath(`/q/[slug]`, 'page')
    revalidatePath('/dashboard')
}

export async function getReviewStatus(questionId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    const { data } = await supabase
        .from('review_list')
        .select('id')
        .eq('user_id', user.id)
        .eq('question_id', questionId)
        .single()

    return !!data
}
