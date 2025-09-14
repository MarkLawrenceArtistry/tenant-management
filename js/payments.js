import { protectPage } from './utils/auth.js';
import { initializePageLayout } from './components/layout.js';
import { supabase } from './lib/supabase.js';
import { setupModal, closeModal } from './utils/ui.js';

let allPayments = [];
let tenantsWithContracts = [];

document.addEventListener('DOMContentLoaded', async () => {
    const session = await protectPage();
    if (!session) return;

    const pageContentHTML = `
        <div class="page-header">
            <h2>Payment Tracking</h2>
            <div class="page-actions" style="display: flex; gap: 1rem;">
                <button id="open-bill-modal-btn" class="btn btn-secondary"><i class="fas fa-file-invoice"></i> Create New Bill</button>
                <button id="open-payment-modal-btn" class="btn btn-primary"><i class="fas fa-plus"></i> Record Payment</button>
            </div>
        </div>
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr><th>Tenant</th><th>Property</th><th>Due Date</th><th>Amount</th><th>Status</th><th>Payment Date</th><th>Actions</th></tr>
                </thead>
                <tbody id="payments-table-body"></tbody>
            </table>
        </div>

        <!-- Create Bill Modal -->
        <div id="create-bill-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header"><h3>Create a New Bill</h3><span class="close">&times;</span></div>
                <form id="create-bill-form" class="modal-form">
                    <div class="form-group">
                        <label for="bill-tenant">Select Tenant (must have a contract)</label>
                        <select id="bill-tenant" required></select>
                    </div>
                    <div id="contract-info-display" style="display:none; background: var(--primary-bg); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;"></div>
                    <div class="form-group">
                        <label for="bill-month">Select Billable Month</label>
                        <select id="bill-month" required></select>
                    </div>
                    <div class="modal-actions"><button type="button" class="btn btn-secondary close-modal-btn">Cancel</button><button type="submit" class="btn btn-primary">Generate Bill</button></div>
                </form>
            </div>
        </div>

        <!-- Record Payment Modal -->
        <div id="add-payment-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header"><h3>Record a Payment</h3><span class="close">&times;</span></div>
                <form id="add-payment-form" class="modal-form">
                    <div class="form-group"><label for="payment-tenant">Tenant *</label><select id="payment-tenant" required></select></div>
                    <div class="form-group"><label for="payment-due-date">For Due Date *</label><select id="payment-due-date" required></select></div>
                    <div class="form-group"><label for="payment-amount">Payment Amount *</label><input type="number" id="payment-amount" step="0.01" required></div>
                    <div class="form-group"><label for="payment-date">Payment Date *</label><input type="date" id="payment-date" required></div>
                    <div class="form-group"><label for="payment-method">Payment Method *</label><select id="payment-method" required><option value="Cash">Cash</option><option value="Bank Transfer">Bank Transfer</option><option value="Credit Card">Credit Card</option></select></div>
                    <div class="modal-actions"><button type="button" class="btn btn-secondary close-modal-btn">Cancel</button><button type="submit" class="btn btn-primary">Record Payment</button></div>
                </form>
            </div>
        </div>
    `;

    initializePageLayout({
        activeNav: 'payments',
        pageTitle: 'Payments',
        pageSubtitle: 'Create bills and record tenant payments',
        user: session.user,
        pageContentHTML
    });

    setupModal('add-payment-modal', 'open-payment-modal-btn');
    setupModal('create-bill-modal', 'open-bill-modal-btn');
    setupEventListeners();
    fetchDataAndRender();
});

function setupEventListeners() {
    document.getElementById('add-payment-form').addEventListener('submit', handleRecordPayment);
    document.getElementById('create-bill-form').addEventListener('submit', handleCreateBill);
    document.getElementById('payment-tenant').addEventListener('change', updateDueDateDropdown);
    document.getElementById('payment-due-date').addEventListener('change', updatePaymentAmount);
    document.getElementById('bill-tenant').addEventListener('change', handleTenantSelectionForBilling);
    
    document.getElementById('payments-table-body').addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        
        if (target.classList.contains('revert-btn')) {
            handleRevertPayment(target.dataset.id);
        }
        if (target.classList.contains('delete-btn')) {
            handleDeletePayment(target.dataset.id);
        }
    });
}

async function fetchDataAndRender() {
    try {
        const [paymentsRes, tenantsRes] = await Promise.all([
            supabase.from('payments').select('*, tenants(first_name, last_name), properties(name)').order('due_date', { ascending: false }),
            supabase.from('tenants').select('id, first_name, last_name, rent_amount, contracts(*), properties(id, name)').order('last_name')
        ]);
        if (paymentsRes.error) throw paymentsRes.error;
        if (tenantsRes.error) throw tenantsRes.error;
        allPayments = paymentsRes.data;
        tenantsWithContracts = tenantsRes.data.filter(t => t.contracts && t.contracts.length > 0);
        renderPaymentsTable();
        populateRecordPaymentTenantDropdown(tenantsRes.data);
        populateBillTenantDropdown();
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function renderPaymentsTable() {
    const tbody = document.getElementById('payments-table-body');
    if (allPayments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No payment records found. Create a bill to get started.</td></tr>`;
        return;
    }
    tbody.innerHTML = allPayments.map(p => {
        // --- NEW: Conditionally render the Revert button ---
        const revertButton = p.status === 'paid' ? `<button data-id="${p.id}" class="btn btn-secondary revert-btn">Revert</button>` : '';

        return `
            <tr>
                <td>${p.tenants?.first_name || 'N/A'} ${p.tenants?.last_name || ''}</td>
                <td>${p.properties?.name || 'N/A'}</td>
                <td>${p.due_date}</td>
                <td>₱${parseFloat(p.amount).toLocaleString()}</td>
                <td><span class="status ${p.status}">${p.status}</span></td>
                <td>${p.payment_date || 'N/A'}</td>
                <td style="display: flex; gap: 0.5rem;">
                    ${revertButton}
                    <button data-id="${p.id}" class="btn btn-danger delete-btn">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function populateBillTenantDropdown() {
    const billTenantSelect = document.getElementById('bill-tenant');
    billTenantSelect.innerHTML = '<option value="">Select a tenant...</option>';
    billTenantSelect.innerHTML += tenantsWithContracts.map(t => `<option value="${t.id}">${t.first_name} ${t.last_name}</option>`).join('');
}

function handleTenantSelectionForBilling() {
    const tenantId = document.getElementById('bill-tenant').value;
    const infoDisplay = document.getElementById('contract-info-display');
    const monthSelect = document.getElementById('bill-month');
    if (!tenantId) {
        infoDisplay.style.display = 'none';
        monthSelect.innerHTML = '';
        return;
    }
    const tenant = tenantsWithContracts.find(t => t.id === tenantId);
    const contract = tenant.contracts[0];
    infoDisplay.innerHTML = `<strong>Contract:</strong> ${new Date(contract.contract_start_date + 'T00:00:00').toLocaleDateString()} to ${new Date(contract.contract_end_date + 'T00:00:00').toLocaleDateString()}<br><strong>Rent:</strong> ₱${parseFloat(tenant.rent_amount).toLocaleString()}`;
    infoDisplay.style.display = 'block';
    let billableMonths = [];
    let currentDate = new Date(contract.contract_start_date + 'T00:00:00');
    let endDate = new Date(contract.contract_end_date + 'T00:00:00');
    while (currentDate <= endDate) {
        billableMonths.push(currentDate.toISOString().slice(0, 7));
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    const existingBilledMonths = allPayments.filter(p => p.tenant_id === tenantId).map(p => p.due_date.slice(0, 7));
    const unbilledMonths = billableMonths.filter(m => !existingBilledMonths.includes(m));
    monthSelect.innerHTML = '<option value="">Select a month to bill...</option>';
    if (unbilledMonths.length > 0) {
        monthSelect.innerHTML += unbilledMonths.map(month => {
            const date = new Date(month + '-02');
            const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            return `<option value="${month}">${monthName}</option>`;
        }).join('');
    } else {
        monthSelect.innerHTML = '<option value="">All months have been billed</option>';
    }
}

async function handleCreateBill(e) {
    e.preventDefault();
    const form = e.target;
    const tenantId = form['bill-tenant'].value;
    const month = form['bill-month'].value;
    if (!tenantId || !month) { alert('Please select a tenant and a billable month.'); return; }
    const tenant = tenantsWithContracts.find(t => t.id === tenantId);
    const newBill = { tenant_id: tenantId, property_id: tenant.properties.id, amount: tenant.rent_amount, due_date: `${month}-01`, status: 'pending' };
    try {
        const { error } = await supabase.from('payments').insert([newBill]);
        if (error) throw error;
        form.reset();
        document.getElementById('contract-info-display').style.display = 'none';
        closeModal('create-bill-modal');
        fetchDataAndRender();
    } catch (error) {
        console.error('Error creating bill:', error);
        alert(`Failed to create bill: ${error.message}`);
    }
}

function populateRecordPaymentTenantDropdown(allTenants) {
    const tenantSelect = document.getElementById('payment-tenant');
    tenantSelect.innerHTML = '<option value="">Select a tenant...</option>';
    tenantSelect.innerHTML += allTenants.map(t => `<option value="${t.id}">${t.first_name} ${t.last_name}</option>`).join('');
}

function updateDueDateDropdown() {
    const tenantId = document.getElementById('payment-tenant').value;
    const dueDateSelect = document.getElementById('payment-due-date');
    const unpaidPayments = allPayments.filter(p => p.tenant_id === tenantId && (p.status === 'pending' || p.status === 'overdue'));
    dueDateSelect.innerHTML = '<option value="">Select due date...</option>';
    if (unpaidPayments.length > 0) {
        dueDateSelect.innerHTML += unpaidPayments.map(p => `<option value="${p.id}">${p.due_date} (₱${p.amount})</option>`).join('');
    } else {
        dueDateSelect.innerHTML = '<option value="">No unpaid bills for this tenant</option>';
    }
    updatePaymentAmount();
}

function updatePaymentAmount() {
    const paymentId = document.getElementById('payment-due-date').value;
    const amountInput = document.getElementById('payment-amount');
    const selectedPayment = allPayments.find(p => p.id === paymentId);
    amountInput.value = selectedPayment ? selectedPayment.amount : '';
}

async function handleRecordPayment(e) {
    e.preventDefault();
    const form = e.target;
    const paymentId = form['payment-due-date'].value;
    if (!paymentId) { alert('Please select a due date to record a payment for.'); return; }
    const paymentData = { payment_date: form['payment-date'].value, payment_method: form['payment-method'].value, amount: form['payment-amount'].value, status: 'paid' };
    try {
        const { error } = await supabase.from('payments').update(paymentData).eq('id', paymentId);
        if (error) throw error;
        form.reset();
        closeModal('add-payment-modal');
        fetchDataAndRender();
    } catch (error) {
        console.error('Error recording payment:', error);
        alert(`Failed to record payment: ${error.message}`);
    }
}

async function handleRevertPayment(paymentId) {
    if (confirm('Are you sure you want to mark this payment as pending? This will undo the payment record.')) {
        try {
            const updates = {
                status: 'pending',
                payment_date: null,
                payment_method: null
            };
            const { error } = await supabase.from('payments').update(updates).eq('id', paymentId);
            if (error) throw error;
            fetchDataAndRender();
        } catch (error) {
            console.error('Error reverting payment:', error);
            alert(`Failed to revert payment: ${error.message}`);
        }
    }
}

async function handleDeletePayment(paymentId) {
    if (confirm('Are you sure you want to delete this payment record? This cannot be undone.')) {
        try {
            const { error } = await supabase.from('payments').delete().eq('id', paymentId);
            if (error) throw error;
            fetchDataAndRender();
        } catch (error) {
            console.error('Error deleting payment record:', error);
            alert(`Failed to delete payment record: ${error.message}`);
        }
    }
}