// SVG Icon Constants
const COPY_ICON = `<svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const TRASH_ICON = `<svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
const STAR_OUTLINE_ICON = `<svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
const STAR_FILLED_ICON = `<svg class="action-icon" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
const EYE_ICON = `<svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const EYE_OFF_ICON = `<svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

// Helper to safely parse and create an SVG element from static icon strings, avoiding innerHTML linter warnings
function setButtonIcon(button, svgString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = doc.documentElement;
  // Clear any existing children (e.g. previous icons) and append the new one safely
  button.replaceChildren(svgElement);
}

// State Variables
let activeTab = 'clipboard'; // 'clipboard' or 'vault'
let clipboardHistory = [];
let vaultHistory = [];
let passwordVisibility = {}; // ID -> boolean (true if revealed)
let toastTimeout = null;

// DOM Elements
const tabClipboard = document.getElementById('tab-clipboard');
const tabVault = document.getElementById('tab-vault');
const searchInput = document.getElementById('search-input');
const clipboardList = document.getElementById('clipboard-list');
const vaultList = document.getElementById('vault-list');
const emptyState = document.getElementById('empty-state');
const clearAllBtn = document.getElementById('clear-all-btn');
const vaultDisclaimer = document.getElementById('vault-disclaimer');
const toast = document.getElementById('toast');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const autoClearToggle = document.getElementById('auto-clear-toggle');
const togglePrivacyBtn = document.getElementById('toggle-privacy-btn');
const privacyContent = document.getElementById('privacy-content');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  
  // Load autoClearOnClose setting state
  const settings = await chrome.storage.local.get({ autoClearOnClose: false });
  if (autoClearToggle) {
    autoClearToggle.checked = settings.autoClearOnClose;
  }

  setupEventListeners();
  render();
});

// Load data from chrome.storage.local
async function loadData() {
  const data = await chrome.storage.local.get({
    clipboardHistory: [],
    vaultHistory: []
  });
  clipboardHistory = data.clipboardHistory;
  vaultHistory = data.vaultHistory;
}

// Save specific key to storage
async function saveToStorage(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

// Show toast notification
function showToast(message) {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  toast.querySelector('span').textContent = message || 'Copied to clipboard!';
  toast.classList.add('show');
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 1500);
}

// Copy text helper
async function copyToClipboard(text, message, isPassword = false) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(message);
    
    // Move the copied item to the top of the list in local storage
    if (!isPassword) {
      chrome.runtime.sendMessage({ action: 'addClipboardItem', text: text });
    } else {
      const entry = vaultHistory.find(i => i.password === text);
      if (entry) {
        chrome.runtime.sendMessage({ action: 'addVaultItem', password: text, website: entry.website });
      }
    }
    
    // Wait for the background worker to write to storage, then reload and re-render
    setTimeout(async () => {
      await loadData();
      render();
    }, 100);
  } catch (err) {
    console.error('Failed to copy text:', err);
  }
}

// Relative time formatter
function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Format clipboard display text (60 chars max)
function truncateText(text, length = 60) {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

// Setup Event Listeners
function setupEventListeners() {
  // Tab Switch: Clipboard
  tabClipboard.addEventListener('click', () => {
    if (activeTab === 'clipboard') return;
    activeTab = 'clipboard';
    tabClipboard.classList.add('active');
    tabVault.classList.remove('active');
    clipboardList.classList.add('active');
    vaultList.classList.remove('active');
    vaultDisclaimer.classList.add('hidden');
    searchInput.placeholder = 'Search clipboard...';
    searchInput.value = '';
    render();
  });

  // Tab Switch: Vault
  tabVault.addEventListener('click', () => {
    if (activeTab === 'vault') return;
    activeTab = 'vault';
    tabVault.classList.add('active');
    tabClipboard.classList.remove('active');
    vaultList.classList.add('active');
    clipboardList.classList.remove('active');
    vaultDisclaimer.classList.remove('hidden');
    searchInput.placeholder = 'Search websites...';
    searchInput.value = '';
    render();
  });

  // Real-time Search
  searchInput.addEventListener('input', () => {
    render();
  });

  // Clear All Button
  clearAllBtn.addEventListener('click', async () => {
    if (activeTab === 'clipboard') {
      const pinnedItems = clipboardHistory.filter(item => item.pinned);
      const unpinnedCount = clipboardHistory.length - pinnedItems.length;
      
      if (unpinnedCount === 0) {
        showToast('No unpinned items to clear');
        return;
      }
      
      clipboardHistory = pinnedItems;
      await saveToStorage('clipboardHistory', clipboardHistory);
      showToast('Cleared unpinned items');
      render();
    } else {
      if (vaultHistory.length === 0) {
        showToast('Vault is already empty');
        return;
      }
      if (confirm('Are you sure you want to clear all passwords in the vault?')) {
        vaultHistory = [];
        passwordVisibility = {};
        await saveToStorage('vaultHistory', vaultHistory);
        showToast('Vault cleared');
        render();
      }
    }
  });

  // Settings Panel Open
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (settingsPanel) {
        settingsPanel.classList.remove('hidden');
      }
    });
  }

  // Settings Panel Close
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      if (settingsPanel) {
        settingsPanel.classList.add('hidden');
      }
    });
  }

  // Auto-clear setting toggle change
  if (autoClearToggle) {
    autoClearToggle.addEventListener('change', async (e) => {
      await saveToStorage('autoClearOnClose', e.target.checked);
      showToast(e.target.checked ? 'Auto-clear on close enabled' : 'Auto-clear on close disabled');
    });
  }

  // Privacy Statement Toggle
  if (togglePrivacyBtn) {
    togglePrivacyBtn.addEventListener('click', () => {
      if (privacyContent) {
        const isHidden = privacyContent.classList.toggle('hidden');
        togglePrivacyBtn.classList.toggle('active', !isHidden);
      }
    });
  }
}

// Main Render Function
function render() {
  const query = searchInput.value.toLowerCase().trim();
  
  if (activeTab === 'clipboard') {
    renderClipboard(query);
  } else {
    renderVault(query);
  }
}

// Render Clipboard List
function renderClipboard(query) {
  clipboardList.replaceChildren();
  
  const filtered = clipboardHistory.filter(item => 
    item.text.toLowerCase().includes(query)
  );

  // Sort pinned items to the top, then sort by newest timestamp first
  filtered.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!b.pinned && a.pinned) return 1;
    return b.timestamp - a.timestamp;
  });

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    clipboardList.classList.remove('active');
    return;
  }
  
  emptyState.classList.add('hidden');
  clipboardList.classList.add('active');

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = `item-card ${item.pinned ? 'pinned' : ''}`;
    
    // Clicking card copies full text
    card.addEventListener('click', (e) => {
      // Prevent copy trigger if clicking action buttons
      if (e.target.closest('.action-btn')) return;
      copyToClipboard(item.text, 'Copied item to clipboard', false);
    });

    const header = document.createElement('div');
    header.className = 'item-card-header';

    const time = document.createElement('span');
    time.className = 'item-time';
    time.textContent = formatTimeAgo(item.timestamp);
    header.appendChild(time);

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    // Copy Action Button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn';
    copyBtn.title = 'Copy full text';
    setButtonIcon(copyBtn, COPY_ICON);
    copyBtn.addEventListener('click', () => {
      copyToClipboard(item.text, 'Copied item to clipboard', false);
    });
    actions.appendChild(copyBtn);

    // Pin Action Button
    const pinBtn = document.createElement('button');
    pinBtn.className = `action-btn pin-btn ${item.pinned ? 'pinned' : ''}`;
    pinBtn.title = item.pinned ? 'Unpin item' : 'Pin item';
    setButtonIcon(pinBtn, item.pinned ? STAR_FILLED_ICON : STAR_OUTLINE_ICON);
    pinBtn.addEventListener('click', async () => {
      item.pinned = !item.pinned;
      // Re-sort history (pinned items remain in order, but background script prunes correctly)
      await saveToStorage('clipboardHistory', clipboardHistory);
      render();
    });
    actions.appendChild(pinBtn);

    // Delete Action Button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn delete-btn';
    deleteBtn.title = 'Delete item';
    setButtonIcon(deleteBtn, TRASH_ICON);
    deleteBtn.addEventListener('click', async () => {
      clipboardHistory = clipboardHistory.filter(i => i.id !== item.id);
      await saveToStorage('clipboardHistory', clipboardHistory);
      render();
    });
    actions.appendChild(deleteBtn);

    header.appendChild(actions);
    card.appendChild(header);

    const content = document.createElement('div');
    content.className = 'item-content';
    content.textContent = truncateText(item.text);
    card.appendChild(content);

    clipboardList.appendChild(card);
  });
}

// Render Password Vault List
function renderVault(query) {
  vaultList.replaceChildren();
  
  const filtered = vaultHistory.filter(item => 
    item.website.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    vaultList.classList.remove('active');
    return;
  }
  
  emptyState.classList.add('hidden');
  vaultList.classList.add('active');

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'item-card';

    // Click card to copy password
    card.addEventListener('click', (e) => {
      if (e.target.closest('.action-btn')) return;
      copyToClipboard(item.password, 'Password copied to clipboard', true);
    });

    const header = document.createElement('div');
    header.className = 'item-card-header';

    const website = document.createElement('span');
    website.className = 'item-website';
    website.textContent = item.website;
    website.title = item.website;
    header.appendChild(website);

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const isVisible = passwordVisibility[item.id] || false;

    // Toggle Visibility Action Button
    const eyeBtn = document.createElement('button');
    eyeBtn.className = 'action-btn';
    eyeBtn.title = isVisible ? 'Hide password' : 'Show password';
    setButtonIcon(eyeBtn, isVisible ? EYE_OFF_ICON : EYE_ICON);
    eyeBtn.addEventListener('click', () => {
      passwordVisibility[item.id] = !isVisible;
      render();
    });
    actions.appendChild(eyeBtn);

    // Copy Password Button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn';
    copyBtn.title = 'Copy password';
    setButtonIcon(copyBtn, COPY_ICON);
    copyBtn.addEventListener('click', () => {
      copyToClipboard(item.password, 'Password copied to clipboard', true);
    });
    actions.appendChild(copyBtn);

    // Delete Password Button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn delete-btn';
    deleteBtn.title = 'Delete password';
    setButtonIcon(deleteBtn, TRASH_ICON);
    deleteBtn.addEventListener('click', async () => {
      vaultHistory = vaultHistory.filter(i => i.id !== item.id);
      delete passwordVisibility[item.id];
      await saveToStorage('vaultHistory', vaultHistory);
      render();
    });
    actions.appendChild(deleteBtn);

    header.appendChild(actions);
    card.appendChild(header);

    const content = document.createElement('div');
    content.className = 'item-content password-content';
    
    // Display actual password or bullets
    content.textContent = isVisible ? item.password : '•'.repeat(Math.max(item.password.length, 8));
    card.appendChild(content);

    // Add age subtitle
    const age = document.createElement('div');
    age.className = 'item-time';
    age.style.marginTop = '4px';
    age.textContent = `Copied ${formatTimeAgo(item.timestamp)}`;
    card.appendChild(age);

    vaultList.appendChild(card);
  });
}
