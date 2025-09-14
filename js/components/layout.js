import { logout } from '../utils/auth.js';

function renderSidebar(activeNav) {
    const navItems = [
        { id: 'dashboard', icon: 'fa-tachometer-alt', text: 'Dashboard', href: '/dashboard.html' },
        { id: 'tenants', icon: 'fa-users', text: 'Tenants', href: '/tenants.html' },
        { id: 'properties', icon: 'fa-building', text: 'Properties', href: '/properties.html' },
        { id: 'payments', icon: 'fa-credit-card', text: 'Payments', href: '/payments.html' },
        { id: 'contracts', icon: 'fa-file-signature', text: 'Contracts', href: '/contracts.html' },
        { id: 'reports', icon: 'fa-chart-bar', text: 'Reports', href: '/reports.html' },
        { id: 'settings', icon: 'fa-cog', text: 'Settings', href: '/settings.html' }
    ];
    const navLinks = navItems.map(item => `<a href="${item.href}" class="nav-item ${item.id === activeNav ? 'active' : ''}"><i class="fas ${item.icon}"></i><span>${item.text}</span></a>`).join('');
    return `<nav class="sidebar"><div class="sidebar-header"><div class="logo"><i class="fas fa-building"></i><span>SM GRAND CENTRAL</span></div><p class="company-subtitle">Tenant Management</p></div><ul class="nav-menu">${navLinks}</ul></nav>`;
}

function renderHeader(user, pageTitle, pageSubtitle) {
    return `<header class="top-header"><div class="header-left"><button class="menu-toggle" id="menu-toggle-btn"><i class="fas fa-bars"></i></button><div class="page-title-container"><h1>${pageTitle}</h1><p>${pageSubtitle}</p></div></div><div class="header-right"><div class="user-profile"><span class="user-name">${user.email}</span></div><button id="logout-button" class="btn btn-logout"><i class="fas fa-sign-out-alt"></i> Logout</button></div></header>`;
}

export function initializePageLayout({ activeNav, pageTitle, pageSubtitle, user, pageContentHTML }) {
    const appContainer = document.querySelector('.app-container');
    const mainContentHTML = `<main class="main-content">${renderHeader(user, pageTitle, pageSubtitle)}<div class="page-content">${pageContentHTML}</div></main>`;
    
    // Add loader and toast container to the main body, outside the app-container for global positioning
    document.body.insertAdjacentHTML('beforeend', `
        <div id="toast-container"></div>
        <div id="loader" class="loader-overlay" style="display: none;">
            <div class="loader-spinner"></div>
        </div>
    `);

    appContainer.innerHTML = `${renderSidebar(activeNav)}${mainContentHTML}`;

    // Event Listeners
    document.getElementById('logout-button')?.addEventListener('click', logout);
    
    const menuToggle = document.getElementById('menu-toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    menuToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar?.classList.toggle('open');
    });

    mainContent?.addEventListener('click', () => {
        if (sidebar?.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    });
}