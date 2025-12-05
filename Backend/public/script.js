const API_BASE = "https://links-manager-ph6d.onrender.com/api/links";

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
    console.log('🚀 QuickLink Vault Frontend Initializing...');
    console.log('🌐 Backend URL:', API_BASE);
    
    currentYearEl.textContent = new Date().getFullYear();
    
    // Load stats from localStorage
    copiedCount = parseInt(localStorage.getItem('copiedCount')) || 0;
    editedCount = parseInt(localStorage.getItem('editedCount')) || 0;
    copiedCountEl.textContent = copiedCount;
    editedCountEl.textContent = editedCount;
    
    // Show loading state
    showTableLoading();
    
    // Initialize the app
    initializeApp();
});

// Initialize the application
async function initializeApp() {
    try {
        // Check if backend is accessible
        const isBackendAlive = await checkBackendHealth();
        
        if (isBackendAlive) {
            console.log('✅ Backend is accessible');
            await fetchLinks();
        } else {
            console.error('❌ Backend is not accessible');
            showTableError('Backend server is not responding. Please check the connection.');
        }
        
    } catch (error) {
        console.error('Initialization error:', error);
        showTableError('Failed to initialize application. Please refresh the page.');
    }
}

// Check backend health
async function checkBackendHealth() {
    try {
        // Try the main endpoint with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(API_BASE, {
            signal: controller.signal,
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            mode: 'cors'
        });
        
        clearTimeout(timeoutId);
        
        return response.ok;
        
    } catch (error) {
        console.warn('Backend health check failed:', error.message);
        return false;
    }
}

// Fetch all links from API
async function fetchLinks() {
    try {
        showTableLoading();
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(API_BASE, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            mode: 'cors'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        allLinks = await response.json();
        console.log(`✅ Loaded ${allLinks.length} links`);
        
        renderLinks(allLinks);
        updateStats();
        
        if (allLinks.length === 0) {
            showEmptyState();
        }
        
    } catch (error) {
        console.error('❌ Error fetching links:', error);
        
        if (error.name === 'AbortError') {
            showTableError('Request timeout. Server is taking too long to respond.');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showTableError('Cannot connect to server. Please check your internet connection.');
        } else if (error.message.includes('CORS')) {
            showTableError('CORS error. Please check backend configuration.');
        } else {
            showTableError(`Error loading links: ${error.message}`);
        }
    }
}

// Show loading state in table
function showTableLoading() {
    tableBody.innerHTML = `
        <tr>
            <td colspan="4" class="loading-state">
                <div class="spinner-container">
                    <div class="loading-spinner"></div>
                    <p>Loading links...</p>
                </div>
            </td>
        </tr>
    `;
    
    // Disable search while loading
    if (searchInput) {
        searchInput.disabled = true;
        searchInput.placeholder = 'Loading...';
    }
}

// Show error state in table
function showTableError(message) {
    tableBody.innerHTML = `
        <tr>
            <td colspan="4" class="error-state">
                <div class="error-container">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Connection Error</h3>
                    <p>${message}</p>
                    <button class="btn btn-secondary" id="retry-btn">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            </td>
        </tr>
    `;
    
    // Add retry button event listener
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            showTableLoading();
            initializeApp();
        });
    }
    
    // Enable search with disabled state
    if (searchInput) {
        searchInput.disabled = false;
        searchInput.placeholder = 'Search links...';
        searchInput.value = '';
    }
}

// Show empty state in table
function showEmptyState() {
    tableBody.innerHTML = `
        <tr id="empty-row">
            <td colspan="4" class="empty-state">
                <i class="fas fa-link"></i>
                <h3>No links saved yet</h3>
                <p>Add your first link using the form above</p>
            </td>
        </tr>
    `;
}

// Render links to table
function renderLinks(links) {
    if (!links || links.length === 0) {
        showEmptyState();
        return;
    }
    
    tableBody.innerHTML = '';
    
    links.forEach((link) => {
        const tr = document.createElement('tr');
        tr.classList.add('fade-in');
        
        const createdDate = link.createdAt 
            ? new Date(link.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })
            : 'N/A';
        
        tr.innerHTML = `
            <td>
                <div class="link-label">
                    <i class="${getDomainIcon(link.url)}"></i>
                    ${escapeHtml(link.name)}
                </div>
            </td>
            <td>
                <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="link-url" title="${link.url}">
                    <i class="fas fa-external-link-alt"></i>
                    ${truncateText(link.url, 35)}
                </a>
            </td>
            <td class="time-cell">${createdDate}</td>
            <td>
                <div class="actions-cell">
                    <button class="action-btn copy-btn" data-id="${link._id}" title="Copy URL">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                    <button class="action-btn edit-btn" data-id="${link._id}" title="Edit link">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete-btn" data-id="${link._id}" title="Delete link">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
    
    // Enable search
    if (searchInput) {
        searchInput.disabled = false;
        searchInput.placeholder = 'Search links...';
    }
    
    // Add event listeners to action buttons
    addActionListeners();
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to truncate long text
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Get appropriate icon based on URL domain
function getDomainIcon(url) {
    if (!url) return 'fas fa-link';
    
    const urlStr = url.toLowerCase();
    
    if (urlStr.includes('github.com')) return 'fab fa-github';
    if (urlStr.includes('linkedin.com')) return 'fab fa-linkedin';
    if (urlStr.includes('twitter.com') || urlStr.includes('x.com')) return 'fab fa-twitter';
    if (urlStr.includes('youtube.com')) return 'fab fa-youtube';
    if (urlStr.includes('facebook.com')) return 'fab fa-facebook';
    if (urlStr.includes('instagram.com')) return 'fab fa-instagram';
    if (urlStr.includes('dribbble.com')) return 'fab fa-dribbble';
    if (urlStr.includes('behance.net')) return 'fab fa-behance';
    if (urlStr.includes('stackoverflow.com')) return 'fab fa-stack-overflow';
    if (urlStr.includes('reddit.com')) return 'fab fa-reddit';
    if (urlStr.includes('codepen.io')) return 'fab fa-codepen';
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

// Handle create/update - FIXED VERSION
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    
    if (!name || !url) {
        showToast('Please fill in both fields', 'warning');
        return;
    }
    
    // Format URL if missing protocol
    let formattedUrl = url;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
    }
    
    // Validate URL
    if (!isValidUrl(formattedUrl)) {
        showToast('Please enter a valid URL (e.g., https://example.com)', 'error');
        return;
    }
    
    const payload = { 
        name: name,
        url: formattedUrl
    };
    
    try {
        // Disable form only (not entire UI)
        disableForm(true);
        
        let response;
        
        if (editingId) {
            // Update existing link
            console.log(`🔄 Updating link ${editingId}`, payload);
            
            response = await fetch(`${API_BASE}/${editingId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                editedCount++;
                editedCountEl.textContent = editedCount;
                localStorage.setItem('editedCount', editedCount);
                showToast('✅ Link updated successfully!', 'success');
            }
        } else {
            // Create new link
            console.log('📝 Creating new link', payload);
            
            response = await fetch(API_BASE, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                showToast('✅ Link added successfully!', 'success');
            }
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Request failed with status ${response.status}: ${errorText}`);
        }
        
        // Reset form
        resetForm();
        
        // Refresh the links list
        await fetchLinks();
        
    } catch (error) {
        console.error('Error saving link:', error);
        
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            showToast('Cannot connect to server. Please try again later.', 'error');
        } else {
            showToast(`Error: ${error.message}`, 'error');
        }
        
        // Re-enable form even on error
        disableForm(false);
        
    } finally {
        // Always re-enable form after operation
        disableForm(false);
    }
});

// NEW FUNCTION: Disable/enable only the form
function disableForm(disable) {
    const formElements = [nameInput, urlInput, saveBtn, cancelEditBtn];
    
    formElements.forEach(element => {
        if (element) {
            element.disabled = disable;
            element.style.opacity = disable ? '0.7' : '1';
            element.style.cursor = disable ? 'not-allowed' : '';
        }
    });
    
    // Update save button text based on state
    if (disable) {
        saveBtn.innerHTML = editingId 
            ? '<i class="fas fa-spinner fa-spin"></i> Updating...' 
            : '<i class="fas fa-spinner fa-spin"></i> Saving...';
    } else {
        saveBtn.innerHTML = editingId 
            ? '<i class="fas fa-save"></i> Update Link' 
            : '<i class="fas fa-save"></i> Save Link';
    }
}

// Copy link to clipboard
async function handleCopy(id) {
    try {
        const link = allLinks.find(l => l._id === id);
        if (!link) {
            showToast('Link not found', 'error');
            return;
        }
        
        await navigator.clipboard.writeText(link.url);
        
        // Visual feedback
        const copyBtn = document.querySelector(`.copy-btn[data-id="${id}"]`);
        if (copyBtn) {
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            copyBtn.style.background = 'var(--success)';
            copyBtn.style.color = 'white';
            
            // Revert button after 1.5 seconds
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.style.background = '';
                copyBtn.style.color = '';
            }, 1500);
        }
        
        // Update counter
        copiedCount++;
        copiedCountEl.textContent = copiedCount;
        localStorage.setItem('copiedCount', copiedCount);
        
        showToast('📋 Link copied to clipboard!', 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        
        // Fallback for older browsers
        const link = allLinks.find(l => l._id === id);
        if (link) {
            const textArea = document.createElement('textarea');
            textArea.value = link.url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            showToast('📋 Link copied to clipboard!', 'success');
            
            // Update counter
            copiedCount++;
            copiedCountEl.textContent = copiedCount;
            localStorage.setItem('copiedCount', copiedCount);
        } else {
            showToast('Failed to copy link', 'error');
        }
    }
}

// Start editing a link
function startEdit(id) {
    const link = allLinks.find(l => l._id === id);
    if (!link) {
        showToast('Link not found', 'error');
        return;
    }
    
    editingId = id;
    nameInput.value = link.name;
    urlInput.value = link.url;
    
    // Update UI for edit mode
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Link';
    cancelEditBtn.classList.remove('hidden');
    formTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Link';
    
    // Scroll to form
    document.querySelector('.form-container').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
    
    // Focus on name input
    nameInput.focus();
}

// Delete a link
async function deleteLink(id) {
    const link = allLinks.find(l => l._id === id);
    if (!link) {
        showToast('Link not found', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete "${link.name}"?`)) {
        return;
    }
    
    try {
        // Only disable action buttons, not the entire UI
        const actionButtons = document.querySelectorAll('.action-btn');
        actionButtons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.6';
        });
        
        console.log(`🗑️ Deleting link ${id}`);
        
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Delete failed: ${response.status} ${errorText}`);
        }
        
        showToast('🗑️ Link deleted successfully!', 'success');
        await fetchLinks();
        
    } catch (error) {
        console.error('Error deleting link:', error);
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showToast('Cannot connect to server. Please try again later.', 'error');
        } else {
            showToast(`Error: ${error.message}`, 'error');
        }
        
    } finally {
        // Re-enable action buttons
        const actionButtons = document.querySelectorAll('.action-btn');
        actionButtons.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
        });
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
        new URL(string);
        return true;
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
    
    // Set icon based on type
    let icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    if (type === 'info') icon = 'info-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Show toast with animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Hide after appropriate time
    const duration = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Add CSS for loading states
const style = document.createElement('style');
style.textContent = `
    /* Loading spinner for table */
    .loading-state {
        padding: 60px 20px !important;
        text-align: center;
    }
    
    .spinner-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
    }
    
    .loading-spinner {
        border: 4px solid rgba(79, 70, 229, 0.1);
        border-radius: 50%;
        border-top: 4px solid var(--primary);
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
    }
    
    .loading-state p {
        color: var(--text-light);
        font-size: 1rem;
        margin: 0;
    }
    
    /* Error state */
    .error-state {
        padding: 60px 20px !important;
        text-align: center;
    }
    
    .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
        max-width: 400px;
        margin: 0 auto;
    }
    
    .error-container i {
        font-size: 3rem;
        color: var(--warning);
        margin-bottom: 10px;
    }
    
    .error-container h3 {
        color: var(--text);
        font-size: 1.3rem;
        margin: 0;
    }
    
    .error-container p {
        color: var(--text-light);
        margin: 0 0 20px 0;
        line-height: 1.5;
    }
    
    /* Spinner animation */
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .fa-spinner {
        animation: fa-spin 1s linear infinite;
        margin-right: 8px;
    }
    
    @keyframes fa-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    /* Disabled states */
    .form-input:disabled,
    .btn:disabled {
        background-color: var(--surface);
        cursor: not-allowed;
        opacity: 0.7;
    }
    
    .search-input:disabled {
        background-color: var(--surface);
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);