import { protectPage } from './utils/auth.js';
import { initializePageLayout } from './components/layout.js';
import { supabase } from './lib/supabase.js';
import { setupModal, openModal, closeModal, showLoader, hideLoader, showToast } from './utils/ui.js';

let properties = [];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const session = await protectPage();
    if (!session) return;

    const pageContentHTML = `
    <div class="page-header">
        <h2>Property Management</h2>
        <button id="open-property-modal-btn" class="btn btn-primary"><i class="fas fa-plus"></i> Add New Property</button>
    </div>
    <div class="table-container">
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Floor/Unit</th>
                    <th>Rent</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="properties-table-body"></tbody>
        </table>
    </div>

    <!-- Add/Edit Property Modal -->
    <div id="property-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header"><h3 id="property-modal-title">Add New Property</h3><span class="close">&times;</span></div>
            <form id="property-form" class="modal-form">
                <input type="hidden" id="property-id">
                <div class="form-group"><label for="property-name">Property Name / Unit Name *</label><input type="text" id="property-name" required></div>
                <div class="form-group"><label for="property-address">Building Address *</label><input type="text" id="property-address" required></div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="property-type">Property Type *</label>
                        <select id="property-type" required><option value="">Select Type</option><option value="Apartment">Apartment</option><option value="House">House</option><option value="Commercial">Commercial</option></select>
                    </div>
                    <div class="form-group"><label for="property-rent">Monthly Rent *</label><input type="number" id="property-rent" step="0.01" required></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label for="property-floor-level">Floor Level</label><input type="text" id="property-floor-level" placeholder="e.g., 1st Floor, Ground Floor"></div>
                    <div class="form-group"><label for="property-unit-number">Unit Number</label><input type="text" id="property-unit-number" placeholder="e.g., Unit 101, A5"></div>
                </div>
                <div class="form-group"><label for="property-room-details">Room Details</label><textarea id="property-room-details" rows="2" placeholder="e.g., 2 Bedrooms, 1 Bathroom"></textarea></div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary close-modal-btn">Cancel</button>
                    <button type="submit" id="property-submit-btn" class="btn btn-primary">Add Property</button>
                </div>
            </form>
        </div>
    </div>
`;

    initializePageLayout({
        activeNav: 'properties',
        pageTitle: 'Properties',
        pageSubtitle: 'Manage all property listings',
        user: session.user,
        pageContentHTML
    });

    setupModal('property-modal', 'open-property-modal-btn');
    setupEventListeners();
    fetchDataAndRender();
});

function setupEventListeners() {
    document.getElementById('open-property-modal-btn').addEventListener('click', prepareAddModal);
    document.getElementById('property-form').addEventListener('submit', handleFormSubmit);
    
    document.getElementById('properties-table-body').addEventListener('click', (e) => {
        if (e.target.closest('.edit-btn')) {
            prepareEditModal(e.target.closest('.edit-btn').dataset.id);
        }
        if (e.target.closest('.delete-btn')) {
            handleDeleteProperty(e.target.closest('.delete-btn').dataset.id);
        }
    });
}

// --- DATA FETCHING AND RENDERING ---
async function fetchDataAndRender() {
    showLoader(); // Show loader at the start
    try {
        const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        properties = data;
        renderPropertiesTable(properties);
    } catch (error) {
        console.error('Error fetching properties:', error);
        showToast('Could not load properties.', false); // Show error toast on failure
    } finally {
        hideLoader(); // ALWAYS hide loader at the end
    }
}

function renderPropertiesTable(properties) {
    const tbody = document.getElementById('properties-table-body');
    if (properties.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No properties found. Add one to get started.</td></tr>`;
        return;
    }
    tbody.innerHTML = properties.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.type}</td>
            <td>${p.floor_level || 'N/A'} / ${p.unit_number || 'N/A'}</td>
            <td>₱${parseFloat(p.monthly_rent || 0).toLocaleString()}</td>
            <td><span class="status ${p.status || 'vacant'}">${p.status || 'vacant'}</span></td>
            <td>
                <button data-id="${p.id}" class="btn btn-secondary edit-btn">Edit</button>
                <button data-id="${p.id}" class="btn btn-danger delete-btn">Delete</button>
            </td>
        </tr>
    `).join('');
}

// --- MODAL AND FORM LOGIC ---
function prepareAddModal() {
    document.getElementById('property-form').reset();
    document.getElementById('property-id').value = '';
    document.getElementById('property-modal-title').textContent = 'Add New Property';
    document.getElementById('property-submit-btn').textContent = 'Add Property';
    openModal('property-modal');
}

function prepareEditModal(propertyId) {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    document.getElementById('property-form').reset();
    document.getElementById('property-id').value = property.id;
    document.getElementById('property-name').value = property.name;
    document.getElementById('property-address').value = property.address;
    document.getElementById('property-type').value = property.type;
    document.getElementById('property-rent').value = property.monthly_rent;
    document.getElementById('property-floor-level').value = property.floor_level;
    document.getElementById('property-unit-number').value = property.unit_number;
    document.getElementById('property-room-details').value = property.room_details;

    document.getElementById('property-modal-title').textContent = 'Edit Property';
    document.getElementById('property-submit-btn').textContent = 'Save Changes';
    openModal('property-modal');
}

// --- CUD OPERATIONS ---
async function handleFormSubmit(e) {
    e.preventDefault();
    showLoader(); // Show loader at the start of the action
    const form = e.target;
    const propertyId = form['property-id'].value;
    const propertyData = {
        name: form['property-name'].value,
        address: form['property-address'].value,
        type: form['property-type'].value,
        monthly_rent: form['property-rent'].value,
        floor_level: form['property-floor-level'].value,
        unit_number: form['property-unit-number'].value,
        room_details: form['property-room-details'].value,
    };

    try {
        let error;
        if (propertyId) {
            const { error: updateError } = await supabase.from('properties').update(propertyData).eq('id', propertyId);
            error = updateError;
        } else {
            propertyData.status = 'vacant';
            const { error: insertError } = await supabase.from('properties').insert([propertyData]);
            error = insertError;
        }
        if (error) throw error;
        
        closeModal('property-modal');
        await fetchDataAndRender(); // Re-fetch data (will hide its own loader)
        showToast(`Property ${propertyId ? 'updated' : 'added'} successfully.`); // Show success toast
        
    } catch (error) {
        console.error('Error saving property:', error);
        showToast(`Error: ${error.message}`, false); // Show error toast
        hideLoader(); // Manually hide loader on error
    }
}

async function handleDeleteProperty(propertyId) {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    if (property.status === 'occupied') {
        // NOTE: Replaced alert() with showToast()
        showToast('Cannot delete an occupied property. Please remove the assigned tenant first.', false);
        return;
    }
    
    if (confirm('Are you sure you want to delete this property?')) {
        showLoader(); // Show loader after confirmation
        try {
            const { error } = await supabase.from('properties').delete().eq('id', propertyId);
            if (error) throw error;
            
            await fetchDataAndRender(); // Re-fetch data
            showToast('Property deleted successfully.'); // Show success toast
            
        } catch (error) {
            console.error('Error deleting property:', error);
            showToast(`Error: ${error.message}`, false); // Show error toast
            hideLoader(); // Manually hide loader on error
        }
    }
}