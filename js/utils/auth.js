import { supabase } from '../lib/supabase.js';

export async function redirectIfLoggedIn(path = '/dashboard.html') {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = path;
    }
}

export async function protectPage() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/login.html';
    }
    return session;
}

export async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/login.html';
}