const API_BASE = "http://localhost:5000/api/links";

// DOM Elements
const form = document.getElementById("link-form");
const nameInput = document.getElementById("name");
const urlInput = document.getElementById("url");
const tableBody = document.getElementById("links-table-body");
const saveBtn = document.getElementById("save-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const formTitle = document.getElementById("form-title");
const searchInput = document.getElementById("search-input");
const totalLinksEl = document.getElementById('total-links');
const copiedCountEl = document.getElementById('copied-count');
const editedCountEl = document.getElementById('edited-count');
const currentYearEl = document.getElementById('current-year');

let editingId = null;
let allLinks = [];
let copiedCount = 0;
let editedCount = 0;

// Load links on page load
window.addEventListener('DOMContentLoaded', () => {
    currentYearEl.textContent = new Date().getFullYear();
    
    // Load stats from localStorage
    copiedCount = parseInt(localStorage.getItem('copiedCount')) || 0;
    editedCount = parseInt(localStorage.getItem('editedCount')) || 0;
    copiedCountEl.textContent = copiedCount;
    editedCountEl.textContent = editedCount;
    
    fetchLinks();
});

// Fetch all links from API
async function fetchLinks() {
    try {
        showLoading(true);
        const res = await fetch(API_BASE);
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        allLinks = await res.json();
        renderLinks(allLinks);
        updateStats();
        showLoading(false);
    } catch (error) {
        console.error('Error fetching links:', error);
        showToast('Error loading links. Please check your connection.', 'error');
        showLoading(false);
    }
}

// Render links to table
function renderLinks(links) {
    if (!links || links.length === 0) {
        tableBody.innerHTML = `
            <tr id="empty-row">
                <td colspan="4" class="empty-state">
                    <i class="fas fa-link"></i>
                    <h3>No links saved yet</h3>
                    <p>Add your first link using the form above</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    links.forEach((link) => {
        const tr = document.createElement('tr');
        tr.classList.add('fade-in');
        
        const createdDate = new Date(link.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        tr.innerHTML = `
            <td>
                <div class="link-label">
                    <i class="${getDomainIcon(link.url)}"></i>
                    ${link.name}
                </div>
            </td>
            <td>
                <a href="${link.url}" target="_blank" class="link-url">
                    <i class="fas fa-external-link-alt"></i>
                    ${link.url}
                </a>
            </td>
            <td class="time-cell">${createdDate}</td>
            <td>
                <div class="actions-cell">
                    <button class="action-btn copy-btn" data-id="${link._id}">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                    <button class="action-btn edit-btn" data-id="${link._id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete-btn" data-id="${link._id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
    
    // Add event listeners to action buttons
    addActionListeners();
}

// Get appropriate icon based on URL domain
function getDomainIcon(url) {
    if (!url) return 'fas fa-link';
    
    if (url.includes('github.com')) return 'fab fa-github';
    if (url.includes('linkedin.com')) return 'fab fa-linkedin';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'fab fa-twitter';
    if (url.includes('youtube.com')) return 'fab fa-youtube';
    if (url.includes('facebook.com')) return 'fab fa-facebook';
    if (url.includes('instagram.com')) return 'fab fa-instagram';
    if (url.includes('dribbble.com')) return 'fab fa-dribbble';
    if (url.includes('behance.net')) return 'fab fa-behance';
    if (url.includes('stackoverflow.com')) return 'fab fa-stack-overflow';
    if (url.includes('reddit.com')) return 'fab fa-reddit';
    return 'fas fa-link';
}

// Add event listeners to action buttons
function addActionListeners() {
    // Copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            handleCopy(id);
        });
    });
    
    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            startEdit(id);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            deleteLink(id);
        });
    });
}

// Handle create/update
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    
    if (!name || !url) {
        showToast('Please fill in both fields', 'warning');
        return;
    }
    
    // Validate URL format
    if (!isValidUrl(url)) {
        showToast('Please enter a valid URL starting with http:// or https://', 'error');
        return;
    }
    
    const payload = { name, url };
    
    try {
        showLoading(true);
        
        if (editingId) {
            // Update existing link
            const res = await fetch(`${API_BASE}/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!res.ok) throw new Error('Update failed');
            
            editedCount++;
            editedCountEl.textContent = editedCount;
            localStorage.setItem('editedCount', editedCount);
            
            showToast('Link updated successfully!', 'success');
        } else {
            // Create new link
            const res = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!res.ok) throw new Error('Create failed');
            
            showToast('Link added successfully!', 'success');
        }
        
        // Reset form and refresh list
        resetForm();
        await fetchLinks();
        
    } catch (error) {
        console.error('Error saving link:', error);
        showToast('Error saving link. Please try again.', 'error');
        showLoading(false);
    }
});

// Copy link to clipboard
async function handleCopy(id) {
    try {
        const link = allLinks.find(l => l._id === id);
        if (!link) return;
        
        await navigator.clipboard.writeText(link.url);
        
        // Visual feedback
        const copyBtn = document.querySelector(`.copy-btn[data-id="${id}"]`);
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        copyBtn.style.background = 'var(--success)';
        copyBtn.style.color = 'white';
        
        // Update counter
        copiedCount++;
        copiedCountEl.textContent = copiedCount;
        localStorage.setItem('copiedCount', copiedCount);
        
        // Revert button after 1.5 seconds
        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.style.background = '';
            copyBtn.style.color = '';
        }, 1500);
        
        showToast('Link copied to clipboard!', 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        showToast('Failed to copy. Please try again.', 'error');
    }
}

// Start editing a link
async function startEdit(id) {
    const link = allLinks.find(l => l._id === id);
    if (!link) return;
    
    editingId = id;
    nameInput.value = link.name;
    urlInput.value = link.url;
    
    // Update UI for edit mode
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Link';
    cancelEditBtn.classList.remove('hidden');
    formTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Link';
    
    // Scroll to form
    document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
    
    // Focus on name input
    nameInput.focus();
}

// Delete a link
async function deleteLink(id) {
    const link = allLinks.find(l => l._id === id);
    if (!link) return;
    
    if (!confirm(`Are you sure you want to delete "${link.name}"?`)) return;
    
    try {
        showLoading(true);
        
        const res = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE'
        });
        
        if (!res.ok) throw new Error('Delete failed');
        
        showToast('Link deleted successfully!', 'success');
        await fetchLinks();
        
    } catch (error) {
        console.error('Error deleting link:', error);
        showToast('Error deleting link. Please try again.', 'error');
        showLoading(false);
    }
}

// Reset form to add mode
function resetForm() {
    form.reset();
    editingId = null;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Link';
    cancelEditBtn.classList.add('hidden');
    formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Link';
    nameInput.focus();
}

// Cancel edit button handler
cancelEditBtn.addEventListener('click', resetForm);

// Search functionality
searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase().trim();
    
    if (!searchTerm) {
        renderLinks(allLinks);
        return;
    }
    
    const filteredLinks = allLinks.filter(link => 
        link.name.toLowerCase().includes(searchTerm) || 
        link.url.toLowerCase().includes(searchTerm)
    );
    
    renderLinks(filteredLinks);
});

// Update statistics
function updateStats() {
    totalLinksEl.textContent = allLinks.length;
}

// Validate URL format
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Show/hide loading state
function showLoading(isLoading) {
    const buttons = document.querySelectorAll('.btn, .action-btn');
    const inputs = document.querySelectorAll('.form-input, .search-input');
    
    if (isLoading) {
        buttons.forEach(btn => btn.classList.add('loading'));
        inputs.forEach(input => input.setAttribute('disabled', 'true'));
    } else {
        buttons.forEach(btn => btn.classList.remove('loading'));
        inputs.forEach(input => input.removeAttribute('disabled'));
    }
}