import { protectPage } from './utils/auth.js';
import { initializePageLayout } from './components/layout.js';
import { supabase } from './lib/supabase.js';
import { setupModal, openModal, closeModal, showLoader, hideLoader, showToast } from './utils/ui.js';

let tenants = [];
let properties = [];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const session = await protectPage();
    if (!session) return;

    const pageContentHTML = `
        <div class="page-header">
            <h2>Tenant Management</h2>
            <button id="open-tenant-modal-btn" class="btn btn-primary"><i class="fas fa-plus"></i> Add New Tenant</button>
        </div>
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Property</th>
                        <th>Rent</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="tenants-table-body"></tbody>
            </table>
        </div>

        <!-- Add/Edit Tenant Modal -->
        <div id="tenant-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="tenant-modal-title">Add New Tenant</h3>
                    <span class="close">&times;</span>
                </div>
                <form id="tenant-form" class="modal-form">
                    <input type="hidden" id="tenant-id">
                    <div class="form-row">
                        <div class="form-group"><label for="tenant-first-name">First Name *</label><input type="text" id="tenant-first-name" required></div>
                        <div class="form-group"><label for="tenant-last-name">Last Name *</label><input type="text" id="tenant-last-name" required></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label for="tenant-email">Email *</label><input type="email" id="tenant-email" required></div>
                        <div class="form-group"><label for="tenant-phone">Phone *</label><input type="tel" id="tenant-phone" required></div>
                    </div>
                    <hr style="border-color: var(--border-color); margin: 1.5rem 0;">
                    <div class="form-group">
                        <label for="tenant-property">Assign to Property *</label>
                        <select id="tenant-property" required></select>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label for="tenant-rent">Rent Amount *</label><input type="number" id="tenant-rent" step="0.01" required></div>
                        <div class="form-group"><label for="tenant-lease-start">Lease Start Date *</label><input type="date" id="tenant-lease-start" required></div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary close-modal-btn">Cancel</button>
                        <button type="submit" id="tenant-submit-btn" class="btn btn-primary">Add Tenant</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    initializePageLayout({
        activeNav: 'tenants',
        pageTitle: 'Tenants',
        pageSubtitle: 'Manage all tenant records',
        user: session.user,
        pageContentHTML
    });
    
    // Note the changed modal ID passed to setupModal
    setupModal('tenant-modal', 'open-tenant-modal-btn');
    setupEventListeners();
    fetchDataAndRender();
});

function setupEventListeners() {
    document.getElementById('open-tenant-modal-btn').addEventListener('click', prepareAddModal);
    document.getElementById('tenant-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('tenant-property').addEventListener('change', handlePropertySelection);
    
    document.getElementById('tenants-table-body').addEventListener('click', (e) => {
        if (e.target.closest('.edit-btn')) {
            const tenantId = e.target.closest('.edit-btn').dataset.id;
            prepareEditModal(tenantId);
        }
        if (e.target.closest('.delete-btn')) {
            const tenantId = e.target.closest('.delete-btn').dataset.id;
            handleDeleteTenant(tenantId);
        }
    });
}

// --- DATA FETCHING AND RENDERING ---
async function fetchDataAndRender() {
    showLoader();
    try {
        const [tenantsRes, propertiesRes] = await Promise.all([
            supabase.from('tenants').select('*, properties(name)').order('created_at', { ascending: false }),
            supabase.from('properties').select('*')
        ]);
        if (tenantsRes.error) throw tenantsRes.error;
        if (propertiesRes.error) throw propertiesRes.error;
        tenants = tenantsRes.data;
        properties = propertiesRes.data;
        renderTenantsTable();
    } catch (error) {
        console.error('Error fetching data:', error);
        showToast('Could not load tenant data.', false);
    } finally {
        hideLoader();
    }
}

function renderTenantsTable() {
    const tbody = document.getElementById('tenants-table-body');
    if (tenants.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No tenants found. Add one to get started.</td></tr>`;
        return;
    }
    tbody.innerHTML = tenants.map(t => `
        <tr>
            <td><a href="/tenant-details.html?id=${t.id}" class="table-link">${t.first_name} ${t.last_name}</a></td>
            <td>${t.email}</td>
            <td>${t.phone || 'N/A'}</td>
            <td>${t.properties ? t.properties.name : 'Unassigned'}</td>
            <td>₱${parseFloat(t.rent_amount || 0).toLocaleString()}</td>
            <td><span class="status ${t.status || 'active'}">${t.status || 'active'}</span></td>
            <td style="display: flex; gap: 0.5rem;">
                <button data-id="${t.id}" class="btn btn-secondary edit-btn">Edit</button>
                <button data-id="${t.id}" class="btn btn-danger delete-btn">Delete</button>
            </td>
        </tr>
    `).join('');
}

// --- MODAL AND FORM LOGIC ---
function prepareAddModal() {
    document.getElementById('tenant-form').reset();
    document.getElementById('tenant-id').value = '';
    document.getElementById('tenant-modal-title').textContent = 'Add New Tenant';
    document.getElementById('tenant-submit-btn').textContent = 'Add Tenant';
    populatePropertiesDropdown(); // Populate with only vacant properties
    openModal('tenant-modal');
}

function prepareEditModal(tenantId) {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;

    document.getElementById('tenant-form').reset();
    document.getElementById('tenant-id').value = tenant.id;
    document.getElementById('tenant-first-name').value = tenant.first_name;
    document.getElementById('tenant-last-name').value = tenant.last_name;
    document.getElementById('tenant-email').value = tenant.email;
    document.getElementById('tenant-phone').value = tenant.phone;
    document.getElementById('tenant-rent').value = tenant.rent_amount;
    document.getElementById('tenant-lease-start').value = tenant.lease_start_date;

    populatePropertiesDropdown(tenant.property_id); // Pass current property to include it
    document.getElementById('tenant-property').value = tenant.property_id;
    
    document.getElementById('tenant-modal-title').textContent = 'Edit Tenant';
    document.getElementById('tenant-submit-btn').textContent = 'Save Changes';
    openModal('tenant-modal');
}

function populatePropertiesDropdown(currentPropertyId = null) {
    const select = document.getElementById('tenant-property');
    // Start with vacant properties
    let availableProperties = properties.filter(p => p.status === 'vacant');

    // If we're editing, and the tenant's current property isn't in the list, add it.
    if (currentPropertyId) {
        const currentProperty = properties.find(p => p.id === currentPropertyId);
        if (currentProperty && !availableProperties.some(p => p.id === currentPropertyId)) {
            availableProperties.push(currentProperty);
        }
    }
    
    let optionsHTML = '<option value="">Select a property...</option>';
    optionsHTML += availableProperties.map(p => `<option value="${p.id}">${p.name} (Unit: ${p.unit_number || 'N/A'})</option>`).join('');
    select.innerHTML = optionsHTML;
}

function handlePropertySelection(e) {
    const propertyId = e.target.value;
    const rentInput = document.getElementById('tenant-rent');
    if (!propertyId) {
        rentInput.value = '';
        return;
    }
    const selectedProperty = properties.find(p => p.id === propertyId);
    if (selectedProperty) {
        rentInput.value = selectedProperty.monthly_rent;
    }
}

// --- CUD OPERATIONS ---
async function handleFormSubmit(e) {
    e.preventDefault();
    showLoader();
    const form = e.target;
    const tenantId = form['tenant-id'].value;

    const tenantData = {
        first_name: form['tenant-first-name'].value,
        last_name: form['tenant-last-name'].value,
        email: form['tenant-email'].value,
        phone: form['tenant-phone'].value,
        property_id: form['tenant-property'].value,
        rent_amount: form['tenant-rent'].value,
        lease_start_date: form['tenant-lease-start'].value,
        status: 'active'
    };

    try {
        let error;
        if (tenantId) {
            // UPDATE logic
            const { error: updateError } = await supabase.from('tenants').update(tenantData).eq('id', tenantId);
            error = updateError;
        } else {
            // INSERT logic
            const { error: insertError } = await supabase.from('tenants').insert(tenantData);
            error = insertError;
            // Also update the newly assigned property to 'occupied'
            if (!error && tenantData.property_id) {
                await supabase.from('properties').update({ status: 'occupied' }).eq('id', tenantData.property_id);
            }
        }
        if (error) throw error;
        
        closeModal('tenant-modal');
        await fetchDataAndRender(); // fetchDataAndRender will hide the loader
        showToast(`Tenant ${tenantId ? 'updated' : 'added'} successfully.`);
        
    } catch (error) {
        console.error('Error saving tenant:', error);
        showToast(`Error: ${error.message}`, false);
        hideLoader();
    }
}

async function handleDeleteTenant(tenantId) {
    if (!confirm('Are you sure you want to delete this tenant? This will also set their assigned property to "vacant".')) {
        return;
    }
    try {
        const tenantToDelete = tenants.find(t => t.id === tenantId);
        if (!tenantToDelete) throw new Error("Tenant not found.");
        
        const { error: deleteError } = await supabase.from('tenants').delete().eq('id', tenantId);
        if (deleteError) throw deleteError;

        if (tenantToDelete.property_id) {
            await supabase.from('properties').update({ status: 'vacant' }).eq('id', tenantToDelete.property_id);
        }
        await fetchDataAndRender(); // fetchDataAndRender will hide the loader
        showToast('Tenant deleted successfully.');
    } catch (error) {
        console.error('Error deleting tenant:', error);
        showToast(`Error: ${error.message}`, false);
        hideLoader();
    }
}