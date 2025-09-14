import { protectPage } from './utils/auth.js';
import { initializePageLayout } from './components/layout.js';
import { supabase } from './lib/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const session = await protectPage();
    if (!session) return;

    const pageContentHTML = `
        <div class="page-header">
            <h2>System Settings</h2>
        </div>
        <div class="settings-card" style="max-width: 600px;">
            <h3>Change Your Password</h3>
            <form id="change-password-form" class="modal-form">
                <div class="form-group">
                    <label for="new-password">New Password</label>
                    <input type="password" id="new-password" placeholder="Enter a strong new password" required>
                </div>
                <button type="submit" class="btn btn-primary">Update Password</button>
            </form>
            <div id="settings-message" style="display: none; margin-top: 1rem;"></div>
        </div>
    `;

    initializePageLayout({
        activeNav: 'settings',
        pageTitle: 'Settings',
        pageSubtitle: 'Manage your account and system preferences',
        user: session.user,
        pageContentHTML
    });
    
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('change-password-form').addEventListener('submit', handleChangePassword);
}

async function handleChangePassword(e) {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const messageEl = document.getElementById('settings-message');

    if (newPassword.length < 6) {
        alert('Password should be at least 6 characters long.');
        return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
        messageEl.textContent = "Failed to update password: " + error.message;
        messageEl.className = "message error";
        console.error('Password update error:', error);
    } else {
        messageEl.textContent = "Password updated successfully!";
        messageEl.className = "message success";
        document.getElementById('change-password-form').reset();
    }
    messageEl.style.display = 'block';
}