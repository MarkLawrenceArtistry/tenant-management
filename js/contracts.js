import { protectPage } from './utils/auth.js';
import { initializePageLayout } from './components/layout.js';
import { supabase } from './lib/supabase.js';
import { setupModal, openModal, closeModal } from './utils/ui.js';

let contracts = [];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const session = await protectPage();
    if (!session) return;

    const pageContentHTML = `
        <div class="page-header">
            <h2>Contract Management</h2>
            <button id="open-contract-modal-btn" class="btn btn-primary"><i class="fas fa-plus"></i> Add New Contract</button>
        </div>
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr><th>Tenant</th><th>Property</th><th>Start Date</th><th>End Date</th><th>Document</th><th>Actions</th></tr>
                </thead>
                <tbody id="contracts-table-body"></tbody>
            </table>
        </div>

        <!-- Add/Edit Contract Modal -->
        <div id="contract-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header"><h3 id="contract-modal-title">Add New Contract</h3><span class="close">&times;</span></div>
                <form id="contract-form" class="modal-form">
                    <input type="hidden" id="contract-id">
                    <div class="form-group"><label for="contract-tenant">Select Tenant *</label><select id="contract-tenant" required></select></div>
                    <div class="form-group"><label for="contract-property">Select Property *</label><select id="contract-property" required></select></div>
                    <div class="form-group">
                        <label for="contract-file">Upload Document</label>
                        <input type="file" id="contract-file" accept=".pdf,.doc,.docx,.png,.jpg">
                        <small style="color: var(--text-secondary); margin-top: 0.5rem; display: block;">Leave blank if you are not replacing the existing document.</small>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label for="contract-start-date">Start Date *</label><input type="date" id="contract-start-date" required></div>
                        <div class="form-group"><label for="contract-end-date">End Date *</label><input type="date" id="contract-end-date" required></div>
                    </div>
                    <div class="form-group"><label for="contract-notes">Notes</label><textarea id="contract-notes" rows="3"></textarea></div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary close-modal-btn">Cancel</button>
                        <button type="submit" id="contract-submit-btn" class="btn btn-primary">Save Contract</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    initializePageLayout({
        activeNav: 'contracts',
        pageTitle: 'Contracts',
        pageSubtitle: 'Manage all tenant contracts and documents',
        user: session.user,
        pageContentHTML
    });

    setupModal('contract-modal', 'open-contract-modal-btn');
    setupEventListeners();
    fetchDataAndRender();
});

function setupEventListeners() {
    document.getElementById('open-contract-modal-btn').addEventListener('click', prepareAddModal);
    document.getElementById('contract-form').addEventListener('submit', handleFormSubmit);
    
    document.getElementById('contracts-table-body').addEventListener('click', (e) => {
        if (e.target.closest('.edit-btn')) {
            prepareEditModal(e.target.closest('.edit-btn').dataset.id);
        }
        if (e.target.closest('.delete-btn')) {
            handleDeleteContract(e.target.closest('.delete-btn').dataset.id);
        }
    });
}

// --- DATA FETCHING AND RENDERING ---
async function fetchDataAndRender() {
    try {
        const [contractsRes, tenantsRes, propertiesRes] = await Promise.all([
            supabase.from('contracts').select('*, tenants(first_name, last_name), properties(name)').order('created_at', { ascending: false }),
            supabase.from('tenants').select('id, first_name, last_name').order('last_name'),
            supabase.from('properties').select('id, name').order('name')
        ]);

        if (contractsRes.error) throw contractsRes.error;
        if (tenantsRes.error) throw tenantsRes.error;
        if (propertiesRes.error) throw propertiesRes.error;

        contracts = contractsRes.data;
        renderContractsTable();
        populateDropdowns(tenantsRes.data, propertiesRes.data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function renderContractsTable() {
    const tbody = document.getElementById('contracts-table-body');
    tbody.innerHTML = contracts.length === 0 ? `<tr><td colspan="6" style="text-align:center;">No contracts found.</td></tr>` : contracts.map(c => `
        <tr>
            <td>${c.tenants?.first_name || 'N/A'} ${c.tenants?.last_name || ''}</td>
            <td>${c.properties?.name || 'N/A'}</td>
            <td>${c.contract_start_date}</td>
            <td>${c.contract_end_date}</td>
            <td><a href="${c.file_path}" target="_blank" class="btn btn-secondary">View</a></td>
            <td>
                <button data-id="${c.id}" class="btn btn-secondary edit-btn">Edit</button>
                <button data-id="${c.id}" class="btn btn-danger delete-btn">Delete</button>
            </td>
        </tr>
    `).join('');
}

function populateDropdowns(tenants, properties) {
    const tenantSelect = document.getElementById('contract-tenant');
    const propertySelect = document.getElementById('contract-property');
    tenantSelect.innerHTML = '<option value="">Select a tenant...</option>' + tenants.map(t => `<option value="${t.id}">${t.first_name} ${t.last_name}</option>`).join('');
    propertySelect.innerHTML = '<option value="">Select a property...</option>' + properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

// --- MODAL AND FORM LOGIC ---
function prepareAddModal() {
    document.getElementById('contract-form').reset();
    document.getElementById('contract-id').value = '';
    document.getElementById('contract-modal-title').textContent = 'Add New Contract';
    document.getElementById('contract-submit-btn').textContent = 'Save Contract';
    document.getElementById('contract-file').required = true; // File is required when adding
    openModal('contract-modal');
}

function prepareEditModal(contractId) {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    document.getElementById('contract-form').reset();
    document.getElementById('contract-id').value = contract.id;
    document.getElementById('contract-tenant').value = contract.tenant_id;
    document.getElementById('contract-property').value = contract.property_id;
    document.getElementById('contract-start-date').value = contract.contract_start_date;
    document.getElementById('contract-end-date').value = contract.contract_end_date;
    document.getElementById('contract-notes').value = contract.notes;
    
    document.getElementById('contract-modal-title').textContent = 'Edit Contract';
    document.getElementById('contract-submit-btn').textContent = 'Save Changes';
    document.getElementById('contract-file').required = false; // File is optional when editing
    openModal('contract-modal');
}

// --- CUD OPERATIONS ---
async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const contractId = form['contract-id'].value;
    const fileInput = form['contract-file'];
    const newFile = fileInput.files[0];

    // Build the data object for the database
    const contractData = {
        tenant_id: form['contract-tenant'].value,
        property_id: form['contract-property'].value,
        contract_start_date: form['contract-start-date'].value,
        contract_end_date: form['contract-end-date'].value,
        notes: form['contract-notes'].value
    };

    try {
        if (contractId) { // --- UPDATE LOGIC ---
            if (newFile) { // If a new file is being uploaded
                const contractToUpdate = contracts.find(c => c.id === contractId);
                // 1. Delete old file from storage
                const oldFilePath = contractToUpdate.file_path.split('/contracts/')[1];
                await supabase.storage.from('contracts').remove([oldFilePath]);

                // 2. Upload new file
                const newFilePath = `${contractData.tenant_id}/${Date.now()}_${newFile.name}`;
                const { error: uploadError } = await supabase.storage.from('contracts').upload(newFilePath, newFile);
                if (uploadError) throw uploadError;

                // 3. Get new public URL and add to data object
                const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(newFilePath);
                contractData.file_path = urlData.publicUrl;
                contractData.file_name = newFile.name;
            }
            // 4. Update the database record
            const { error } = await supabase.from('contracts').update(contractData).eq('id', contractId);
            if (error) throw error;
        } else { // --- INSERT LOGIC ---
            if (!newFile) {
                alert('A document is required when adding a new contract.');
                return;
            }
            const filePath = `${contractData.tenant_id}/${Date.now()}_${newFile.name}`;
            const { error: uploadError } = await supabase.storage.from('contracts').upload(filePath, newFile);
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(filePath);
            contractData.file_path = urlData.publicUrl;
            contractData.file_name = newFile.name;
            
            const { error: insertError } = await supabase.from('contracts').insert([contractData]);
            if (insertError) throw insertError;
        }

        closeModal('contract-modal');
        fetchDataAndRender();
    } catch (error) {
        console.error('Error saving contract:', error);
        alert(`Failed to save contract: ${error.message}`);
    }
}

async function handleDeleteContract(contractId) {
    if (!confirm('Are you sure you want to delete this contract? The associated document will also be permanently deleted.')) return;
    try {
        const contractToDelete = contracts.find(c => c.id === contractId);
        if (!contractToDelete) throw new Error("Contract not found.");
        const filePathInBucket = contractToDelete.file_path.split('/contracts/')[1];
        if (filePathInBucket) {
            await supabase.storage.from('contracts').remove([filePathInBucket]);
        }
        const { error: dbError } = await supabase.from('contracts').delete().eq('id', contractId);
        if (dbError) throw dbError;
        fetchDataAndRender();
    } catch (error) {
        console.error('Error deleting contract:', error);
        alert(`Failed to delete contract: ${error.message}`);
    }
}