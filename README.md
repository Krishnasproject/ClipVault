# ClipVault 🛡️

ClipVault is a secure, **100% local** clipboard history manager and password vault built as a lightweight Chrome and Firefox extension. Designed with a privacy-first mindset, it ensures that your copied text and sensitive passwords never leave your device.

---

## ✨ Features

- **📋 Local Clipboard History**: Automatically saves text copied to your clipboard (up to 20 items) so you can quickly retrieve and re-copy them. Pin important items to prevent them from being cleared.
- **🔑 Secure Password Vault**: Detects when you copy passwords from password fields and saves them separately in the encrypted/sandboxed password vault along with their respective websites.
- **🧹 Smart Privacy Protection (Auto-Delete)**: Clipboard history automatically detects and filters out API keys, tokens, or security hashes (any contiguous 32+ character mixed-case string or common API prefixes like `ghp_` or `sk_live_`). This prevents highly sensitive credentials from being stored in plain text.
- **⚡ Session Control**: Toggle the **Auto-clear history on browser close** setting to automatically wipe all clipboard and vault records when you close the browser session.
- **🔒 Privacy-First Design**: The extension requests **zero network permissions** and makes **zero network requests** (no tracking, no analytics, no external servers). All data remains sandboxed locally in your browser's `chrome.storage.local`.

---

## 🛠️ Installation

Since ClipVault is local-first, you can load it directly into Google Chrome or Mozilla Firefox as a developer extension:

### Google Chrome
1. **Download/Clone this repository**:
   ```bash
   git clone https://github.com/Krishnasproject/ClipVault.git
   ```
2. **Open Chrome Extensions**:
   Navigate to `chrome://extensions/` in your Chrome browser.
3. **Enable Developer Mode**:
   Toggle the **Developer mode** switch in the top-right corner of the page.
4. **Load the Extension**:
   Click **Load unpacked** in the top-left corner and select the `ClipVault` directory containing `manifest.json`.
5. **Pin ClipVault**:
   Click the puzzle piece icon in your Chrome toolbar and pin **ClipVault** for easy access!

### Mozilla Firefox
1. **Download/Clone this repository**:
   ```bash
   git clone https://github.com/Krishnasproject/ClipVault.git
   ```
2. **Open Firefox Debugging**:
   Navigate to `about:debugging` in your Firefox browser.
3. **Select This Firefox**:
   Click **This Firefox** in the left sidebar menu.
4. **Load Temporary Add-on**:
   Click **Load Temporary Add-on...** and select the `manifest.json` file inside the `ClipVault` folder.
5. **Pin ClipVault**:
   Click the Extensions (jigsaw piece) icon in the Firefox toolbar and pin **ClipVault** for quick access!

---

## 🖥️ How to Use

### 📋 Clipboard Tab
- Simply copy text on any web page (via `Ctrl+C` or right-click copy).
- Click the ClipVault icon in the toolbar to see your history.
- Click any item card to copy it back to your clipboard instantly.
- Use the ⭐ star icon to pin items, or the 🗑️ trash icon to delete individual items.

### 🔑 Password Vault Tab
- When you type and copy a password from an actual password input field, ClipVault automatically saves it under the **Password Vault** tab.
- Click the eye icon (👁️) to reveal/hide a password, or click the copy icon to copy it.
- Credentials in the vault are kept separate from the standard clipboard history and are **never** subjected to the auto-delete filter.

### ⚙️ Settings
- Click the **Gear icon** in the header to access the settings panel.
- Toggle **Auto-clear history on browser close** to wipe all stored data at the end of your browsing session.

---

## 🛡️ Privacy Statement

ClipVault stores all clipboard items, vault credentials, and preferences locally using your browser's sandboxed storage (`chrome.storage.local`). The extension does not request host or network permissions, meaning it is physically incapable of transmitting your data to any external server or third party.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
