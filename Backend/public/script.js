// Import API configuration
import { API_BASE } from "./config.js";

// DOM Elements
const linkForm = document.getElementById("link-form");
const nameInput = document.getElementById("name");
const urlInput = document.getElementById("url");
const linksTableBody = document.getElementById("links-table-body");
const searchInput = document.getElementById("search-input");
const totalLinksEl = document.getElementById('total-links');
const copiedCountEl = document.getElementById('copied-count');
const editedCountEl = document.getElementById('edited-count');
const currentYearEl = document.getElementById('current-year');
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const formTitle = document.getElementById("form-title");
const saveBtn = document.getElementById("save-btn");

let allLinks = [];
let defaultFolderId = null;
let copiedCount = 0;
let editedCount = 0;
let currentEditLinkId = null;

// Load on page load
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 QuickLink Vault Initializing...');
    
    if (currentYearEl) {
        currentYearEl.textContent = new Date().getFullYear();
    }
    
    // Load stats from localStorage
    copiedCount = parseInt(localStorage.getItem('copiedCount')) || 0;
    editedCount = parseInt(localStorage.getItem('editedCount')) || 0;
    if (copiedCountEl) copiedCountEl.textContent = copiedCount;
    if (editedCountEl) editedCountEl.textContent = editedCount;
    
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
            // Get or create default folder
            await ensureDefaultFolder();
            await fetchLinks();
        } else {
            console.error('❌ Backend is not accessible');
            showErrorState('Backend server is not responding. Please check the connection.');
        }
        
    } catch (error) {
        console.error('Initialization error:', error);
        showErrorState('Failed to initialize application. Please refresh the page.');
    }
}

// Check backend health
async function checkBackendHealth() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${API_BASE}/health`, {
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

// Ensure default folder exists
async function ensureDefaultFolder() {
    try {
        const response = await fetch(`${API_BASE}/folders`, {
            headers: { 'Accept': 'application/json' },
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const folders = await response.json();
        
        // Find or create default folder
        let defaultFolder = folders.find(f => f.name === 'General');
        
        if (!defaultFolder) {
            // Create default folder
            const createResponse = await fetch(`${API_BASE}/folders`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    name: 'General',
                    description: 'Default folder for links'
                })
            });
            
            if (!createResponse.ok) {
                throw new Error('Failed to create default folder');
            }
            
            defaultFolder = await createResponse.json();
        }
        
        defaultFolderId = defaultFolder._id;
        console.log('✅ Default folder ready:', defaultFolderId);
        
    } catch (error) {
        console.error('❌ Error ensuring default folder:', error);
        throw error;
    }
}

// Fetch all links
async function fetchLinks() {
    try {
        if (!defaultFolderId) {
            await ensureDefaultFolder();
        }
        
        const response = await fetch(`${API_BASE}/folders`, {
            headers: { 'Accept': 'application/json' },
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const folders = await response.json();
        const defaultFolder = folders.find(f => f._id === defaultFolderId);
        
        if (defaultFolder) {
            allLinks = defaultFolder.links || [];
            console.log(`✅ Loaded ${allLinks.length} links`);
        } else {
            allLinks = [];
        }
        
        renderLinks();
        updateStats();
        
    } catch (error) {
        console.error('❌ Error fetching links:', error);
        showErrorState('Cannot load links. Please try again.');
    }
}

// Show error state
function showErrorState(message) {
    if (linksTableBody) {
        linksTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Connection Error</h3>
                    <p>${message}</p>
                    <button class="btn btn-secondary" onclick="location.reload()">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

// Render links to table
function renderLinks(filteredLinks = null) {
    if (!linksTableBody) return;
    
    const linksToRender = filteredLinks || allLinks;
    
    if (!linksToRender || linksToRender.length === 0) {
        linksTableBody.innerHTML = `
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
    
    linksTableBody.innerHTML = linksToRender.map(link => {
        const createdDate = new Date(link.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        return `
            <tr data-link-id="${link._id}">
                <td>
                    <div class="link-label">
                        <i class="fas fa-tag"></i>
                        ${escapeHtml(link.name)}
                    </div>
                </td>
                <td>
                    <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="link-url">
                        <i class="${getDomainIcon(link.url)}"></i>
                        ${truncateText(link.url, 50)}
                    </a>
                </td>
                <td class="time-cell">${createdDate}</td>
                <td class="actions-cell">
                    <button class="action-btn copy-btn copy-link-btn" data-link-id="${link._id}" title="Copy URL">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                    <button class="action-btn edit-btn edit-link-btn" data-link-id="${link._id}" title="Edit link">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete-btn delete-link-btn" data-link-id="${link._id}" title="Delete link">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners
    addLinkActionListeners();
}

// Add event listeners to action buttons
function addLinkActionListeners() {
    // Copy link buttons
    document.querySelectorAll('.copy-link-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const linkId = btn.getAttribute('data-link-id');
            copyLink(linkId);
        });
    });
    
    // Edit link buttons
    document.querySelectorAll('.edit-link-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const linkId = btn.getAttribute('data-link-id');
            editLink(linkId);
        });
    });
    
    // Delete link buttons
    document.querySelectorAll('.delete-link-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const linkId = btn.getAttribute('data-link-id');
            deleteLink(linkId);
        });
    });
}

// Handle link form submission
if (linkForm) {
    linkForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = nameInput.value.trim();
        const url = urlInput.value.trim();
        
        if (!name || !url) {
            showToast('Label and URL are required', 'warning');
            return;
        }
        
        // Format URL if missing protocol
        let formattedUrl = url;
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = 'https://' + formattedUrl;
        }
        
        // Validate URL
        if (!isValidUrl(formattedUrl)) {
            showToast('Please enter a valid URL', 'error');
            return;
        }
        
        // Ensure default folder exists
        if (!defaultFolderId) {
            try {
                await ensureDefaultFolder();
            } catch (error) {
                showToast('Failed to initialize. Please refresh the page.', 'error');
                return;
            }
        }
        
        const payload = { 
            name: name,
            url: formattedUrl,
            folderId: defaultFolderId
        };
        
        try {
            disableForm(linkForm, true);
            
            let response;
            if (currentEditLinkId) {
                // Update existing link
                response = await fetch(`${API_BASE}/links/${currentEditLinkId}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        url: formattedUrl
                    })
                });
            } else {
                // Create new link
                response = await fetch(`${API_BASE}/links`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Request failed: ${errorText}`);
            }
            
            showToast(currentEditLinkId ? '✅ Link updated successfully!' : '✅ Link added successfully!', 'success');
            
            // Update edited count if editing
            if (currentEditLinkId) {
                editedCount++;
                if (editedCountEl) editedCountEl.textContent = editedCount;
                localStorage.setItem('editedCount', editedCount);
            }
            
            // Reset form
            linkForm.reset();
            cancelEdit();
            
            // Refresh links
            await fetchLinks();
            
        } catch (error) {
            console.error('Error saving link:', error);
            showToast(`Error: ${error.message}`, 'error');
            
        } finally {
            disableForm(linkForm, false);
        }
    });
}

// Cancel edit mode
function cancelEdit() {
    currentEditLinkId = null;
    if (nameInput) nameInput.value = '';
    if (urlInput) urlInput.value = '';
    if (cancelEditBtn) cancelEditBtn.classList.add('hidden');
    if (formTitle) {
        formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Link';
    }
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Link';
    }
}

// Edit link
function editLink(linkId) {
    const link = allLinks.find(l => l._id === linkId);
    if (!link) return;
    
    currentEditLinkId = linkId;
    if (nameInput) nameInput.value = link.name;
    if (urlInput) urlInput.value = link.url;
    if (cancelEditBtn) cancelEditBtn.classList.remove('hidden');
    if (formTitle) {
        formTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Link';
    }
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Link';
    }
    
    // Scroll to form
    if (linkForm) {
        linkForm.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
    
    if (nameInput) nameInput.focus();
}

// Delete link
async function deleteLink(linkId) {
    const link = allLinks.find(l => l._id === linkId);
    if (!link) return;
    
    if (!confirm(`Are you sure you want to delete "${link.name}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/links/${linkId}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Delete failed: ${errorText}`);
        }
        
        showToast('🗑️ Link deleted successfully!', 'success');
        await fetchLinks();
        
    } catch (error) {
        console.error('Error deleting link:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

// Copy link to clipboard
async function copyLink(linkId) {
    try {
        const link = allLinks.find(l => l._id === linkId);
        
        if (!link) {
            showToast('Link not found', 'error');
            return;
        }
        
        await navigator.clipboard.writeText(link.url);
        
        // Visual feedback
        const copyBtn = document.querySelector(`.copy-link-btn[data-link-id="${linkId}"]`);
        if (copyBtn) {
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            copyBtn.style.background = 'var(--success)';
            copyBtn.style.color = 'white';
            
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.style.background = '';
                copyBtn.style.color = '';
            }, 1500);
        }
        
        // Update counter
        copiedCount++;
        if (copiedCountEl) copiedCountEl.textContent = copiedCount;
        localStorage.setItem('copiedCount', copiedCount);
        
        showToast('📋 Link copied to clipboard!', 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        showToast('Failed to copy link', 'error');
    }
}

// Update statistics
function updateStats() {
    if (totalLinksEl) {
        totalLinksEl.textContent = allLinks.length;
    }
}

// Search functionality
if (searchInput) {
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        
        if (!searchTerm) {
            renderLinks();
            return;
        }
        
        const filteredLinks = allLinks.filter(link => 
            link.name.toLowerCase().includes(searchTerm) || 
            link.url.toLowerCase().includes(searchTerm)
        );
        
        renderLinks(filteredLinks);
    });
}

// Cancel edit button
if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', cancelEdit);
}

// Helper functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

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

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function disableForm(form, disable) {
    if (!form) return;
    
    const elements = form.querySelectorAll('input, button, textarea, select');
    
    elements.forEach(element => {
        element.disabled = disable;
        element.style.opacity = disable ? '0.7' : '1';
        element.style.cursor = disable ? 'not-allowed' : '';
    });
    
    // Update submit button text
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn && disable) {
        const originalHTML = submitBtn.innerHTML;
        submitBtn.dataset.originalHTML = originalHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    } else if (submitBtn && !disable && submitBtn.dataset.originalHTML) {
        submitBtn.innerHTML = submitBtn.dataset.originalHTML;
        delete submitBtn.dataset.originalHTML;
    }
}

function showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    if (type === 'info') icon = 'info-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
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
