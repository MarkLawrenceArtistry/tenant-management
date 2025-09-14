export function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

export function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

export function setupModal(modalId, openBtnId) {
    const openBtn = document.getElementById(openBtnId);
    const modal = document.getElementById(modalId);
    if (modal) {
        const closeBtns = modal.querySelectorAll('.close, .close-modal-btn');
        if (openBtn) openBtn.addEventListener('click', () => openModal(modalId));
        closeBtns.forEach(btn => btn.addEventListener('click', () => closeModal(modalId)));
    }
}

// --- NEW LOADER FUNCTIONS ---
export function showLoader() {
    document.getElementById('loader').style.display = 'flex';
}

export function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}

// --- NEW TOAST NOTIFICATION FUNCTION ---
export function showToast(message, isSuccess = true) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${isSuccess ? 'success' : 'error'}`;
    toast.innerHTML = `<i class="fas ${isSuccess ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${message}`;
    
    container.appendChild(toast);

    // Trigger the animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Remove the toast after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);
}