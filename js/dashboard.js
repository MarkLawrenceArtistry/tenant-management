import { protectPage } from './utils/auth.js';
import { initializePageLayout } from './components/layout.js';
import { supabase } from './lib/supabase.js';
import { showLoader, hideLoader, showToast } from './utils/ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    const session = await protectPage();
    if (!session) return;

    const pageContentHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Occupancy Rate</h3>
                <p id="occupancy-rate">...</p>
            </div>
            <div class="stat-card">
                <h3>Revenue This Month</h3>
                <p id="monthly-revenue">...</p>
            </div>
            <div class="stat-card">
                <h3>Overdue Payments (Value)</h3>
                <p id="overdue-value">...</p>
            </div>
            <div class="stat-card">
                <h3>Active Tenants</h3>
                <p id="active-tenants">...</p>
            </div>
        </div>
    `;

    initializePageLayout({
        activeNav: 'dashboard',
        pageTitle: 'Dashboard',
        pageSubtitle: 'Welcome to SM GRAND CENTRAL Tenant Management',
        user: session.user,
        pageContentHTML
    });

    fetchAndRenderStats();
});

async function fetchAndRenderStats() {
    showLoader();
    try {
        // Get start and end of the current month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

        const [propertiesRes, paymentsRes, tenantsRes] = await Promise.all([
            supabase.from('properties').select('status'),
            supabase.from('payments').select('amount, status, payment_date'),
            supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'active')
        ]);

        if (propertiesRes.error) throw propertiesRes.error;
        if (paymentsRes.error) throw paymentsRes.error;
        if (tenantsRes.error) throw tenantsRes.error;

        const properties = propertiesRes.data;
        const payments = paymentsRes.data;

        // 1. Calculate Occupancy Rate
        const totalProperties = properties.length;
        const occupiedProperties = properties.filter(p => p.status === 'occupied').length;
        const occupancyRate = totalProperties > 0 ? ((occupiedProperties / totalProperties) * 100).toFixed(1) : 0;
        document.getElementById('occupancy-rate').textContent = `${occupancyRate}%`;

        // 2. Calculate Revenue This Month
        const revenueThisMonth = payments
            .filter(p => p.status === 'paid' && p.payment_date >= firstDay && p.payment_date <= lastDay)
            .reduce((sum, p) => sum + p.amount, 0);
        document.getElementById('monthly-revenue').textContent = `₱${revenueThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // 3. Calculate Total Value of Overdue Payments
        const overdueValue = payments
            .filter(p => p.status === 'overdue')
            .reduce((sum, p) => sum + p.amount, 0);
        document.getElementById('overdue-value').textContent = `₱${overdueValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // 4. Get Active Tenants count
        const activeTenants = tenantsRes.count;
        document.getElementById('active-tenants').textContent = activeTenants;

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        showToast('Could not load dashboard data.', false);
        document.getElementById('occupancy-rate').textContent = 'Error';
        document.getElementById('monthly-revenue').textContent = 'Error';
        document.getElementById('overdue-value').textContent = 'Error';
        document.getElementById('active-tenants').textContent = 'Error';
    } finally {
        hideLoader();
    }
}