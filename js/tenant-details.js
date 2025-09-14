import { protectPage } from './utils/auth.js';
import { initializePageLayout } from './components/layout.js';
import { supabase } from './lib/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const session = await protectPage();
    if (!session) return;

    const tenantId = new URLSearchParams(window.location.search).get('id');
    if (!tenantId) {
        alert('No tenant ID provided.');
        window.location.href = '/tenants.html';
        return;
    }

    const { data: tenant, error } = await supabase
        .from('tenants')
        .select(`
            *, 
            properties(*), 
            contracts(*), 
            payments(*)
        `)
        .eq('id', tenantId)
        .single();

    if (error || !tenant) {
        console.error('Error fetching tenant details:', error);
        alert('Tenant not found.');
        window.location.href = '/tenants.html';
        return;
    }

    const pageContentHTML = generatePageContent(tenant);

    initializePageLayout({
        activeNav: 'tenants', // Keep 'tenants' highlighted in the nav
        pageTitle: `${tenant.first_name} ${tenant.last_name}`,
        pageSubtitle: 'Detailed Tenant Overview',
        user: session.user,
        pageContentHTML
    });
});

function generatePageContent(tenant) {
    const contract = tenant.contracts.length > 0 ? tenant.contracts[0] : null;

    const paymentsHTML = tenant.payments.length > 0
        ? tenant.payments.sort((a,b) => new Date(b.due_date) - new Date(a.due_date)).map(p => `
            <tr>
                <td>${p.due_date}</td>
                <td>₱${parseFloat(p.amount).toLocaleString()}</td>
                <td><span class="status ${p.status}">${p.status}</span></td>
                <td>${p.payment_date || 'N/A'}</td>
                <td>${p.payment_method || 'N/A'}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="5" style="text-align:center;">No payment history found.</td></tr>';
    
    const contractsHTML = tenant.contracts.length > 0
        ? tenant.contracts.map(c => `
            <tr>
                <td>${c.contract_start_date} to ${c.contract_end_date}</td>
                <td><a href="${c.file_path}" target="_blank" class="btn btn-secondary">View Document</a></td>
            </tr>
        `).join('')
        : '<tr><td colspan="2" style="text-align:center;">No contracts found.</td></tr>';

    return `
        <div class="page-header">
            <a href="/tenants.html" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Back to All Tenants</a>
        </div>

        <div class="details-grid">
            <div class="detail-card">
                <h3>Tenant Information</h3>
                <p><strong>Email:</strong> ${tenant.email}</p>
                <p><strong>Phone:</strong> ${tenant.phone}</p>
                <p><strong>Status:</strong> <span class="status ${tenant.status}">${tenant.status}</span></p>
                ${tenant.notes ? `<p><strong>Notes:</strong> ${tenant.notes}</p>` : ''}
            </div>

            <div class="detail-card">
                <h3>Lease & Property</h3>
                <p><strong>Property:</strong> ${tenant.properties?.name || 'N/A'}</p>
                <p><strong>Monthly Rent:</strong> ₱${parseFloat(tenant.rent_amount).toLocaleString()}</p>
                <p><strong>Lease Term:</strong> ${contract ? `${contract.contract_start_date} to ${contract.contract_end_date}` : 'No active contract'}</p>
            </div>
        </div>

        <div class="detail-card full-width">
            <h3>Payment History</h3>
            <div class="table-container">
                <table class="data-table">
                    <thead><tr><th>Due Date</th><th>Amount</th><th>Status</th><th>Payment Date</th><th>Method</th></tr></thead>
                    <tbody>${paymentsHTML}</tbody>
                </table>
            </div>
        </div>

        <div class="detail-card full-width">
            <h3>Contracts</h3>
            <div class="table-container">
                <table class="data-table">
                    <thead><tr><th>Term</th><th>Document</th></tr></thead>
                    <tbody>${contractsHTML}</tbody>
                </table>
            </div>
        </div>
    `;
}