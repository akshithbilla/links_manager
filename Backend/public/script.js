const API_BASE = "https://links-manager-ph6d.onrender.com/api";

// DOM Elements
const folderForm = document.getElementById("folder-form");
const folderNameInput = document.getElementById("folder-name");
const folderDescInput = document.getElementById("folder-description");
const linkForm = document.getElementById("link-form");
const linkNameInput = document.getElementById("link-name");
const linkUrlInput = document.getElementById("link-url");
const linkFormContainer = document.querySelector(".link-form-container");
const currentFolderNameSpan = document.getElementById("current-folder-name");
const foldersContainer = document.getElementById("folders-container");
const searchInput = document.getElementById("folder-search-input");
const totalFoldersEl = document.getElementById('total-folders');
const totalLinksEl = document.getElementById('total-links');
const copiedCountEl = document.getElementById('copied-count');
const currentYearEl = document.getElementById('current-year');
const cancelLinkBtn = document.getElementById("cancel-link-btn");

// Modals
const folderModal = document.getElementById("folder-modal");
const linkModal = document.getElementById("link-modal");
const closeFolderModal = document.getElementById("close-folder-modal");
const closeLinkModal = document.getElementById("close-link-modal");
const cancelEditFolderBtn = document.getElementById("cancel-edit-folder");
const cancelEditLinkBtn = document.getElementById("cancel-edit-link");
const editFolderForm = document.getElementById("edit-folder-form");
const editLinkForm = document.getElementById("edit-link-form");

let currentFolderId = null;
let allFolders = [];
let copiedCount = 0;
let currentEditFolderId = null;
let currentEditLinkId = null;

// Load on page load
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 QuickLink Vault with Folders Initializing...');
    
    currentYearEl.textContent = new Date().getFullYear();
    
    // Load stats from localStorage
    copiedCount = parseInt(localStorage.getItem('copiedCount')) || 0;
    copiedCountEl.textContent = copiedCount;
    
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
            await fetchFolders();
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

// Fetch all folders with their links
async function fetchFolders() {
    try {
        showLoadingState();
        
        const response = await fetch(`${API_BASE}/folders`, {
            headers: { 'Accept': 'application/json' },
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        allFolders = await response.json();
        console.log(`✅ Loaded ${allFolders.length} folders`);
        
        renderFolders();
        updateStats();
        
        if (allFolders.length === 0) {
            showEmptyState();
        }
        
    } catch (error) {
        console.error('❌ Error fetching folders:', error);
        showErrorState('Cannot load folders. Please try again.');
    }
}

// Show loading state
function showLoadingState() {
    foldersContainer.innerHTML = `
        <div class="loading-state">
            <div class="spinner-container">
                <div class="loading-spinner"></div>
                <p>Loading folders...</p>
            </div>
        </div>
    `;
}

// Show error state
function showErrorState(message) {
    foldersContainer.innerHTML = `
        <div class="error-state">
            <div class="error-container">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Connection Error</h3>
                <p>${message}</p>
                <button class="btn btn-secondary" id="retry-btn">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        </div>
    `;
    
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            showLoadingState();
            initializeApp();
        });
    }
}

// Show empty state
function showEmptyState() {
    foldersContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-folder-open"></i>
            <h3>No folders yet</h3>
            <p>Create your first folder to start organizing links!</p>
        </div>
    `;
}

// Render folders to the grid
function renderFolders() {
    if (!allFolders || allFolders.length === 0) {
        showEmptyState();
        return;
    }
    
    foldersContainer.innerHTML = '';
    
    allFolders.forEach((folder) => {
        const folderCard = document.createElement('div');
        folderCard.className = 'folder-card';
        folderCard.dataset.folderId = folder._id;
        
        const isExpanded = folder._id === currentFolderId;
        if (isExpanded) {
            folderCard.classList.add('expanded');
        }
        
        folderCard.innerHTML = `
            <div class="folder-header">
                <div class="folder-info">
                    <div class="folder-icon">
                        <i class="fas fa-folder"></i>
                    </div>
                    <div class="folder-details">
                        <h3>${escapeHtml(folder.name)}</h3>
                        <p>${folder.description || 'No description'}</p>
                    </div>
                </div>
                <div class="folder-stats">
                    <span class="folder-count">${folder.links?.length || 0} links</span>
                    <div class="folder-actions">
                        <button class="action-btn add-link-btn" data-folder-id="${folder._id}" title="Add link to this folder">
                            <i class="fas fa-plus"></i> Add Link
                        </button>
                        <button class="action-btn edit-folder-btn" data-folder-id="${folder._id}" title="Edit folder">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-folder-btn" data-folder-id="${folder._id}" title="Delete folder">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="folder-content">
                ${renderLinksList(folder.links || [], folder._id)}
            </div>
        `;
        
        foldersContainer.appendChild(folderCard);
        
        // Add event listeners
        const folderHeader = folderCard.querySelector('.folder-header');
        folderHeader.addEventListener('click', (e) => {
            if (!e.target.closest('.folder-actions')) {
                toggleFolder(folder._id);
            }
        });
    });
    
    // Add event listeners to action buttons
    addFolderActionListeners();
}

// Render links list for a folder
function renderLinksList(links, folderId) {
    if (!links || links.length === 0) {
        return `
            <div class="empty-folder">
                <i class="fas fa-link"></i>
                <h4>No links in this folder</h4>
                <p>Add your first link to get started</p>
                <button class="btn btn-primary add-first-link-btn" data-folder-id="${folderId}">
                    <i class="fas fa-plus"></i> Add First Link
                </button>
            </div>
        `;
    }
    
    const linksHtml = links.map(link => `
        <div class="link-item" data-link-id="${link._id}">
            <div class="link-info">
                <div class="link-icon">
                    <i class="${getDomainIcon(link.url)}"></i>
                </div>
                <div class="link-text">
                    <h4>${escapeHtml(link.name)}</h4>
                    <a href="${link.url}" target="_blank" rel="noopener noreferrer" title="${link.url}">
                        ${truncateText(link.url, 40)}
                    </a>
                </div>
            </div>
            <div class="link-actions">
                <button class="action-btn copy-link-btn" data-link-id="${link._id}" title="Copy URL">
                    <i class="fas fa-copy"></i> Copy
                </button>
                <button class="action-btn edit-link-btn" data-link-id="${link._id}" data-folder-id="${folderId}" title="Edit link">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn delete-link-btn" data-link-id="${link._id}" data-folder-id="${folderId}" title="Delete link">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
    
    return `<div class="links-list">${linksHtml}</div>`;
}

// Toggle folder expansion
function toggleFolder(folderId) {
    const folderCard = document.querySelector(`.folder-card[data-folder-id="${folderId}"]`);
    
    if (folderCard.classList.contains('expanded')) {
        folderCard.classList.remove('expanded');
        currentFolderId = null;
    } else {
        // Close all other folders
        document.querySelectorAll('.folder-card.expanded').forEach(card => {
            card.classList.remove('expanded');
        });
        
        folderCard.classList.add('expanded');
        currentFolderId = folderId;
    }
}

// Add event listeners to folder action buttons
function addFolderActionListeners() {
    // Add link buttons
    document.querySelectorAll('.add-link-btn, .add-first-link-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const folderId = btn.getAttribute('data-folder-id');
            showLinkForm(folderId);
        });
    });
    
    // Edit folder buttons
    document.querySelectorAll('.edit-folder-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const folderId = btn.getAttribute('data-folder-id');
            showEditFolderModal(folderId);
        });
    });
    
    // Delete folder buttons
    document.querySelectorAll('.delete-folder-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const folderId = btn.getAttribute('data-folder-id');
            deleteFolder(folderId);
        });
    });
    
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
            const folderId = btn.getAttribute('data-folder-id');
            showEditLinkModal(linkId, folderId);
        });
    });
    
    // Delete link buttons
    document.querySelectorAll('.delete-link-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const linkId = btn.getAttribute('data-link-id');
            const folderId = btn.getAttribute('data-folder-id');
            deleteLink(linkId, folderId);
        });
    });
}

// Show link form for a specific folder
function showLinkForm(folderId) {
    const folder = allFolders.find(f => f._id === folderId);
    if (!folder) return;
    
    currentFolderId = folderId;
    currentFolderNameSpan.textContent = folder.name;
    
    // Reset form
    linkNameInput.value = '';
    linkUrlInput.value = '';
    
    // Show form
    linkFormContainer.classList.remove('hidden');
    
    // Scroll to form
    linkFormContainer.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
    
    // Focus on name input
    linkNameInput.focus();
}

// Hide link form
function hideLinkForm() {
    linkFormContainer.classList.add('hidden');
    currentFolderId = null;
}

// Handle folder creation
folderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = folderNameInput.value.trim();
    const description = folderDescInput.value.trim();
    
    if (!name) {
        showToast('Folder name is required', 'warning');
        return;
    }
    
    const payload = { 
        name: name,
        description: description || ''
    };
    
    try {
        disableForm(folderForm, true);
        
        const response = await fetch(`${API_BASE}/folders`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Request failed: ${errorText}`);
        }
        
        showToast('✅ Folder created successfully!', 'success');
        folderForm.reset();
        await fetchFolders();
        
    } catch (error) {
        console.error('Error creating folder:', error);
        showToast(`Error: ${error.message}`, 'error');
        
    } finally {
        disableForm(folderForm, false);
    }
});

// Handle link creation
linkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = linkNameInput.value.trim();
    const url = linkUrlInput.value.trim();
    
    if (!name || !url) {
        showToast('Link name and URL are required', 'warning');
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
    
    const payload = { 
        name: name,
        url: formattedUrl,
        folderId: currentFolderId
    };
    
    try {
        disableForm(linkForm, true);
        
        const response = await fetch(`${API_BASE}/links`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Request failed: ${errorText}`);
        }
        
        showToast('✅ Link added successfully!', 'success');
        hideLinkForm();
        await fetchFolders();
        
    } catch (error) {
        console.error('Error creating link:', error);
        showToast(`Error: ${error.message}`, 'error');
        
    } finally {
        disableForm(linkForm, false);
    }
});

// Cancel link form
cancelLinkBtn.addEventListener('click', hideLinkForm);

// Show edit folder modal
function showEditFolderModal(folderId) {
    const folder = allFolders.find(f => f._id === folderId);
    if (!folder) return;
    
    currentEditFolderId = folderId;
    document.getElementById('edit-folder-name').value = folder.name;
    document.getElementById('edit-folder-description').value = folder.description || '';
    
    folderModal.classList.add('active');
}

// Hide edit folder modal
function hideEditFolderModal() {
    folderModal.classList.remove('active');
    currentEditFolderId = null;
}

// Show edit link modal
function showEditLinkModal(linkId, folderId) {
    const folder = allFolders.find(f => f._id === folderId);
    if (!folder) return;
    
    const link = folder.links?.find(l => l._id === linkId);
    if (!link) return;
    
    currentEditLinkId = linkId;
    document.getElementById('edit-link-name').value = link.name;
    document.getElementById('edit-link-url').value = link.url;
    
    linkModal.classList.add('active');
}

// Hide edit link modal
function hideEditLinkModal() {
    linkModal.classList.remove('active');
    currentEditLinkId = null;
}

// Handle edit folder form
editFolderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('edit-folder-name').value.trim();
    const description = document.getElementById('edit-folder-description').value.trim();
    
    if (!name) {
        showToast('Folder name is required', 'warning');
        return;
    }
    
    const payload = { 
        name: name,
        description: description || ''
    };
    
    try {
        disableForm(editFolderForm, true);
        
        const response = await fetch(`${API_BASE}/folders/${currentEditFolderId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Request failed: ${errorText}`);
        }
        
        showToast('✅ Folder updated successfully!', 'success');
        hideEditFolderModal();
        await fetchFolders();
        
    } catch (error) {
        console.error('Error updating folder:', error);
        showToast(`Error: ${error.message}`, 'error');
        
    } finally {
        disableForm(editFolderForm, false);
    }
});

// Handle edit link form
editLinkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('edit-link-name').value.trim();
    const url = document.getElementById('edit-link-url').value.trim();
    
    if (!name || !url) {
        showToast('Link name and URL are required', 'warning');
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
    
    const payload = { 
        name: name,
        url: formattedUrl
    };
    
    try {
        disableForm(editLinkForm, true);
        
        const response = await fetch(`${API_BASE}/links/${currentEditLinkId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Request failed: ${errorText}`);
        }
        
        showToast('✅ Link updated successfully!', 'success');
        hideEditLinkModal();
        await fetchFolders();
        
    } catch (error) {
        console.error('Error updating link:', error);
        showToast(`Error: ${error.message}`, 'error');
        
    } finally {
        disableForm(editLinkForm, false);
    }
});

// Delete folder
async function deleteFolder(folderId) {
    const folder = allFolders.find(f => f._id === folderId);
    if (!folder) return;
    
    if (!confirm(`Are you sure you want to delete "${folder.name}" and all its links?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/folders/${folderId}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Delete failed: ${errorText}`);
        }
        
        showToast('🗑️ Folder deleted successfully!', 'success');
        await fetchFolders();
        
    } catch (error) {
        console.error('Error deleting folder:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

// Delete link
async function deleteLink(linkId, folderId) {
    const folder = allFolders.find(f => f._id === folderId);
    if (!folder) return;
    
    const link = folder.links?.find(l => l._id === linkId);
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
        await fetchFolders();
        
    } catch (error) {
        console.error('Error deleting link:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

// Copy link to clipboard
async function copyLink(linkId) {
    try {
        // Find the link in all folders
        let targetLink = null;
        for (const folder of allFolders) {
            const link = folder.links?.find(l => l._id === linkId);
            if (link) {
                targetLink = link;
                break;
            }
        }
        
        if (!targetLink) {
            showToast('Link not found', 'error');
            return;
        }
        
        await navigator.clipboard.writeText(targetLink.url);
        
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
        copiedCountEl.textContent = copiedCount;
        localStorage.setItem('copiedCount', copiedCount);
        
        showToast('📋 Link copied to clipboard!', 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        showToast('Failed to copy link', 'error');
    }
}

// Update statistics
function updateStats() {
    totalFoldersEl.textContent = allFolders.length;
    
    let totalLinks = 0;
    allFolders.forEach(folder => {
        totalLinks += folder.links?.length || 0;
    });
    totalLinksEl.textContent = totalLinks;
}

// Search functionality
searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase().trim();
    
    if (!searchTerm) {
        renderFolders();
        return;
    }
    
    const filteredFolders = allFolders.filter(folder => 
        folder.name.toLowerCase().includes(searchTerm) ||
        folder.description?.toLowerCase().includes(searchTerm) ||
        folder.links?.some(link => 
            link.name.toLowerCase().includes(searchTerm) || 
            link.url.toLowerCase().includes(searchTerm)
        )
    );
    
    renderFilteredFolders(filteredFolders);
});

// Render filtered folders
function renderFilteredFolders(folders) {
    if (!folders || folders.length === 0) {
        foldersContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No folders found</h3>
                <p>Try a different search term</p>
            </div>
        `;
        return;
    }
    
    foldersContainer.innerHTML = '';
    
    folders.forEach((folder) => {
        const folderCard = document.createElement('div');
        folderCard.className = 'folder-card';
        folderCard.dataset.folderId = folder._id;
        
        folderCard.innerHTML = `
            <div class="folder-header">
                <div class="folder-info">
                    <div class="folder-icon">
                        <i class="fas fa-folder"></i>
                    </div>
                    <div class="folder-details">
                        <h3>${escapeHtml(folder.name)}</h3>
                        <p>${folder.description || 'No description'}</p>
                    </div>
                </div>
                <div class="folder-stats">
                    <span class="folder-count">${folder.links?.length || 0} links</span>
                    <div class="folder-actions">
                        <button class="action-btn add-link-btn" data-folder-id="${folder._id}" title="Add link to this folder">
                            <i class="fas fa-plus"></i> Add Link
                        </button>
                        <button class="action-btn edit-folder-btn" data-folder-id="${folder._id}" title="Edit folder">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-folder-btn" data-folder-id="${folder._id}" title="Delete folder">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="folder-content">
                ${renderLinksList(folder.links || [], folder._id)}
            </div>
        `;
        
        foldersContainer.appendChild(folderCard);
        
        // Add event listeners
        const folderHeader = folderCard.querySelector('.folder-header');
        folderHeader.addEventListener('click', (e) => {
            if (!e.target.closest('.folder-actions')) {
                toggleFolder(folder._id);
            }
        });
    });
    
    addFolderActionListeners();
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

// Modal event listeners
closeFolderModal.addEventListener('click', hideEditFolderModal);
cancelEditFolderBtn.addEventListener('click', hideEditFolderModal);

closeLinkModal.addEventListener('click', hideEditLinkModal);
cancelEditLinkBtn.addEventListener('click', hideEditLinkModal);

// Close modals on outside click
window.addEventListener('click', (e) => {
    if (e.target === folderModal) {
        hideEditFolderModal();
    }
    if (e.target === linkModal) {
        hideEditLinkModal();
    }
});