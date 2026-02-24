'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        return { error: 'Email and password are required' };
    }

    try {
        const supabase = await createClient();

        // This will trigger createClient -> setAll (server-side)
        // Our server client already enforces 10-year cookies in setAll.
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        console.error('Login action error:', err);
        // Expose the error message for debugging the production failure
        return { error: `Server Error: ${err?.message || 'Unknown error'}` };
    }
}
