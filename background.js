// Helper to detect passwords, API keys, or security hashes (32+ random/high-entropy characters)
function isSensitiveToken(token) {
  // Check if it's a hexadecimal string of 32+ characters (MD5/SHA hashes)
  if (/^[a-fA-F0-9]{32,}$/.test(token)) {
    return true;
  }
  
  // Check if it looks like an API key or password (32+ chars with mixed case and digits)
  if (token.length >= 32) {
    const hasDigit = /[0-9]/.test(token);
    const hasUpper = /[A-Z]/.test(token);
    const hasLower = /[a-z]/.test(token);
    if (hasDigit && hasUpper && hasLower) {
      return true;
    }
    
    // Check for common API key prefixes
    if (/^(ghp|gho|ghu|ghs|ghr|sk_live|sk_test|pk_live|pk_test)_[a-zA-Z0-9]{30,}$/.test(token)) {
      return true;
    }
  }
  return false;
}

function containsSensitivePattern(text) {
  if (!text) return false;
  // Split the text by whitespace/newlines/quotes to scan individual words/tokens
  const tokens = text.split(/[\s"']+/);
  for (const token of tokens) {
    // Strip trailing/leading common punctuation
    const cleanToken = token.replace(/^[.,;:!?(]+/g, "").replace(/[.,;:!?)]+$/g, "");
    if (isSensitiveToken(cleanToken)) {
      return true;
    }
  }
  return false;
}

// Clear any sensitive patterns from history
function filterSensitiveHistory(history) {
  return history.filter(item => !containsSensitivePattern(item.text));
}

// Auto-clean existing history on load/startup
async function cleanExistingHistory() {
  try {
    const data = await chrome.storage.local.get({ clipboardHistory: [] });
    const filtered = filterSensitiveHistory(data.clipboardHistory);
    if (filtered.length !== data.clipboardHistory.length) {
      await chrome.storage.local.set({ clipboardHistory: filtered });
      console.log('ClipVault: Auto-cleaned pre-existing sensitive items from clipboard history.');
    }
  } catch (err) {
    console.error('ClipVault: Error during auto-clean:', err);
  }
}

// Generate a unique ID for items
function generateId() {
  if (typeof self !== 'undefined' && typeof self.crypto !== 'undefined' && typeof self.crypto.randomUUID === 'function') {
    return self.crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// Run auto-clean on service worker initialization
cleanExistingHistory();

// Add clipboard text to storage
async function addClipboardItem(text) {
  if (!text) return;
  const trimmed = text.trim();
  if (trimmed.length < 2) return;

  if (containsSensitivePattern(trimmed)) {
    console.log('ClipVault: Clipboard item omitted due to sensitive pattern (password/API key detector).');
    return;
  }

  try {
    const data = await chrome.storage.local.get({ clipboardHistory: [] });
    let history = data.clipboardHistory;

    // Check for duplicates
    const existingIndex = history.findIndex(item => item.text === text);
    let isPinned = false;

    if (existingIndex !== -1) {
      // Keep pinned status if it already exists
      isPinned = history[existingIndex].pinned || false;
      // Remove the old entry
      history.splice(existingIndex, 1);
    }

    // Create new entry at the top
    const newItem = {
      id: generateId(),
      text: text,
      timestamp: Date.now(),
      pinned: isPinned
    };
    history.unshift(newItem);

    // Enforce 20-item limit: prune oldest unpinned items first
    for (let i = history.length - 1; i >= 0; i--) {
      if (history.length <= 20) break;
      if (!history[i].pinned) {
        history.splice(i, 1);
      }
    }

    await chrome.storage.local.set({ clipboardHistory: history });
  } catch (err) {
    console.error('ClipVault: Error saving clipboard item:', err);
  }
}

// Add password and website origin to vault
async function addVaultItem(password, website) {
  if (!password) return;
  const trimmed = password.trim();
  if (trimmed.length < 2) return;

  try {
    const data = await chrome.storage.local.get({ vaultHistory: [] });
    let vault = data.vaultHistory;

    // Check if the same password was copied for this exact website
    const existingIndex = vault.findIndex(item => item.password === password && item.website === website);
    if (existingIndex !== -1) {
      vault.splice(existingIndex, 1);
    }

    // Create new entry at the top
    const newItem = {
      id: generateId(),
      password: password,
      website: website || 'unknown',
      timestamp: Date.now()
    };
    vault.unshift(newItem);

    // Limit vault to 20 items
    if (vault.length > 20) {
      vault = vault.slice(0, 20);
    }

    await chrome.storage.local.set({ vaultHistory: vault });
  } catch (err) {
    console.error('ClipVault: Error saving vault item:', err);
  }
}

// Listen to messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'addClipboardItem') {
    addClipboardItem(message.text);
  } else if (message.action === 'addVaultItem') {
    addVaultItem(message.password, message.website);
  }
  // Return true to indicate asynchronous response if needed, but not required here
  return false;
});

// Auto-clear history on browser startup (which corresponds to after browser close)
chrome.runtime.onStartup.addListener(async () => {
  try {
    const settings = await chrome.storage.local.get({ autoClearOnClose: false });
    if (settings.autoClearOnClose) {
      await chrome.storage.local.set({
        clipboardHistory: [],
        vaultHistory: []
      });
      console.log('ClipVault: Auto-cleared clipboard and vault history on startup.');
    }
  } catch (err) {
    console.error('ClipVault: Error during auto-clear on startup:', err);
  }
});

