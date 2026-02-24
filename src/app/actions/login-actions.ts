'use server';

import { createClient } from '@/lib/supabase/server';

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
        return { error: 'An unexpected error occurred during login' };
    }
}
