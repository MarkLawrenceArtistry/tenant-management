import { supabase } from './lib/supabase.js';
import { redirectIfLoggedIn } from './utils/auth.js';

document.addEventListener('DOMContentLoaded', () => {
    redirectIfLoggedIn();
});

const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('loginErrorMessage');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessage.style.display = 'none';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;
        
        window.location.href = '/dashboard.html';

    } catch (error) {
        console.error('Login failed:', error.message);
        errorMessage.textContent = error.message || 'Invalid email or password.';
        errorMessage.style.display = 'block';
    }
});