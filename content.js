// Helper to traverse shadow DOM and find the truly focused element
function getActiveElement() {
  let activeEl = document.activeElement;
  while (activeEl && activeEl.shadowRoot && activeEl.shadowRoot.activeElement) {
    activeEl = activeEl.shadowRoot.activeElement;
  }
  return activeEl;
}

// Local duplicate suppression
let lastCapturedText = '';
let lastCapturedTime = 0;

function handleCapturedText(text) {
  if (!text) return;
  
  const trimmed = text.trim();
  if (trimmed.length < 2) return; // Ignore under 2 characters

  const now = Date.now();
  // If we captured the exact same text within 200ms, ignore the duplicate message
  if (text === lastCapturedText && (now - lastCapturedTime) < 200) {
    return;
  }
  lastCapturedText = text;
  lastCapturedTime = now;

  const activeEl = getActiveElement();
  const isPassword = activeEl && (activeEl.type === 'password' || activeEl.getAttribute('type') === 'password');

  try {
    if (isPassword) {
      chrome.runtime.sendMessage({
        action: 'addVaultItem',
        password: text,
        website: window.location.hostname || 'unknown'
      });
    } else {
      chrome.runtime.sendMessage({
        action: 'addClipboardItem',
        text: text
      });
    }
  } catch (err) {
    // Suppress errors if extension context is invalidated (e.g. on extension update)
  }
}

// 1. Standard copy event listener (for Ctrl+C, Right-click -> Copy)
document.addEventListener('copy', () => {
  const activeEl = getActiveElement();
  let text = '';
  
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
    try {
      text = activeEl.value.substring(activeEl.selectionStart, activeEl.selectionEnd);
    } catch (e) {
      text = window.getSelection().toString();
    }
  } else {
    text = window.getSelection().toString();
  }
  
  if (!text) {
    text = window.getSelection().toString();
  }
  
  if (text) {
    handleCapturedText(text);
  }
}, true); // Use capture phase to ensure we capture even if page stops propagation

// 2. Listen to custom event dispatched by our page-context injection script.
// We read the data from a DOM attribute to bypass Chrome's Isolated World security boundaries.
window.addEventListener('clipvault-captured', () => {
  const text = document.documentElement.getAttribute('data-clipvault-text');
  if (text) {
    document.documentElement.removeAttribute('data-clipvault-text');
    handleCapturedText(text);
  }
});

// 3. Inject a script into the page context to intercept programmatic clipboard writes
// (e.g. navigator.clipboard.writeText and e.clipboardData.setData in custom page handlers)
try {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      window.clipvault_active = true;
      // Intercept navigator.clipboard.writeText
      if (navigator.clipboard && navigator.clipboard.writeText) {
        const originalWriteText = navigator.clipboard.writeText;
        navigator.clipboard.writeText = function(text) {
          document.documentElement.setAttribute('data-clipvault-text', text);
          window.dispatchEvent(new CustomEvent('clipvault-captured'));
          return originalWriteText.apply(this, arguments);
        };
      }
      
      // Intercept DataTransfer.prototype.setData (used in copy event handlers)
      const originalSetData = DataTransfer.prototype.setData;
      DataTransfer.prototype.setData = function(format, data) {
        if (format && (format.toLowerCase() === 'text' || format.toLowerCase() === 'text/plain')) {
          document.documentElement.setAttribute('data-clipvault-text', data);
          window.dispatchEvent(new CustomEvent('clipvault-captured'));
        }
        return originalSetData.apply(this, arguments);
      };
    })();
  `;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
} catch (err) {
  console.error('ClipVault: Failed to inject interception script:', err);
}
