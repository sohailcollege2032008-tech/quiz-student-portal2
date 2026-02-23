'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function checkUserActivation(bookId: string, bookTitle: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { authenticated: false, activated: false };
        }

        // Use Admin Client to bypass RLS and potentially laggy syncs
        const admin = createAdminClient();

        // 1. Precise Check (Recommended)
        const { data: directActivation } = await admin
            .from('user_book_activations')
            .select('id')
            .eq('user_id', user.id)
            .eq('book_id', bookId)
            .maybeSingle();

        if (directActivation) {
            return { authenticated: true, activated: true, method: 'direct' };
        }

        // 2. Fuzzy Check (By Title)
        // This rescues users who activated a "duplicate" copy of the same book
        if (bookTitle) {
            const { data: allActivations, error: fetchError } = await admin
                .from('user_book_activations')
                .select('*, books!inner(title)')
                .eq('user_id', user.id)
                .eq('books.title', bookTitle);

            if (allActivations && allActivations.length > 0) {
                console.log(`Fuzzy activation match found for user ${user.id} and book "${bookTitle}"`);
                return { authenticated: true, activated: true, method: 'fuzzy' };
            }
        }

        return { authenticated: true, activated: false };
    } catch (error) {
        console.error('Error in checkUserActivation:', error);
        return { authenticated: true, activated: false, error: 'Internal check failed' };
    }
}
