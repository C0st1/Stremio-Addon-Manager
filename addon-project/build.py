import re

with open('/home/z/my-project/addon-project/configure.html.bak', 'r') as f:
    html = f.read()

# =====================================================================
# 1. NEW CSS - Insert before </style>
# =====================================================================
new_css = """

/* ═══════════════════════════════════════════════════════
   TYPE FILTER BUTTONS
═══════════════════════════════════════════════════════ */
.type-filter-bar {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.type-filter-btn {
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  color: var(--text-sec);
  font-size: .78rem;
  font-family: inherit;
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
}
.type-filter-btn:hover { border-color: var(--accent); color: var(--text-pri); }
.type-filter-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.filter-count {
  font-size: .72rem;
  color: var(--text-dim);
  font-family: var(--font-mono);
  margin-left: 4px;
}

/* ═══════════════════════════════════════════════════════
   EXPANDABLE CARD PREVIEW
═══════════════════════════════════════════════════════ */
.addon-card { cursor: pointer; }
.addon-card-preview {
  max-height: 0;
  overflow: hidden;
  transition: max-height .35s ease, padding .35s ease, opacity .25s ease;
  opacity: 0;
  padding: 0 14px;
}
.addon-card-preview.open {
  max-height: 300px;
  opacity: 1;
  padding: 10px 14px 14px;
}
.preview-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
  font-size: .78rem;
  border-top: 1px solid var(--border);
  padding-top: 10px;
}
.preview-field-label { color: var(--text-dim); font-weight: 500; }
.preview-field-value { color: var(--text-sec); word-break: break-all; }
.preview-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border);
  color: var(--text-dim);
  font-size: .78rem;
}

/* ═══════════════════════════════════════════════════════
   FLOATING UNDO/REDO BUTTONS
═══════════════════════════════════════════════════════ */
.undo-redo-float {
  position: fixed;
  bottom: 70px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 90;
}
.undo-redo-float .btn-icon {
  width: 38px; height: 38px;
  border-radius: 50%;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  color: var(--text-sec);
  font-size: 1rem;
  box-shadow: var(--shadow);
  transition: all .15s;
  display: flex; align-items: center; justify-content: center;
}
.undo-redo-float .btn-icon:hover:not([disabled]) { background: var(--bg-hover); color: var(--text-pri); border-color: var(--accent); }
.undo-redo-float .btn-icon[disabled] { opacity: .3; cursor: not-allowed; }

/* ═══════════════════════════════════════════════════════
   PROFILES DROPDOWN
═══════════════════════════════════════════════════════ */
.profiles-wrapper { position: relative; }
.profiles-toggle {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 12px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-sec);
  font-size: .82rem;
  font-family: inherit;
  cursor: pointer;
  transition: all .15s;
}
.profiles-toggle:hover { border-color: var(--accent); color: var(--text-pri); }
.profiles-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 240px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 12px 40px #000000aa;
  z-index: 150;
  opacity: 0;
  transform: translateY(-6px) scale(.97);
  pointer-events: none;
  transition: opacity .18s, transform .18s;
  overflow: hidden;
}
.profiles-dropdown.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
.profiles-dropdown-header {
  padding: 10px 14px;
  font-size: .75rem;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: .06em;
  border-bottom: 1px solid var(--border);
  display: flex; justify-content: space-between; align-items: center;
}
.profiles-list { max-height: 200px; overflow-y: auto; }
.profile-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  cursor: pointer;
  transition: background .12s;
  font-size: .84rem;
  color: var(--text-sec);
}
.profile-item:hover { background: var(--bg-hover); color: var(--text-pri); }
.profile-item.active-profile { color: var(--accent-hi); }
.profile-item-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.profile-item-actions { display: flex; gap: 4px; opacity: 0; transition: opacity .15s; }
.profile-item:hover .profile-item-actions { opacity: 1; }
.profile-item-actions button {
  background: none; border: none; cursor: pointer;
  color: var(--text-dim); font-size: .8rem; padding: 2px 4px;
}
.profile-item-actions button:hover { color: var(--danger); }
.profiles-dropdown-footer {
  padding: 8px 10px;
  border-top: 1px solid var(--border);
  display: flex; gap: 6px;
}
.profiles-dropdown-footer input {
  flex: 1;
  padding: 6px 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-pri);
  font-size: .82rem;
  font-family: inherit;
  outline: none;
}
.profiles-dropdown-footer input:focus { border-color: var(--accent); }

/* ═══════════════════════════════════════════════════════
   DISCOVER PANEL
═══════════════════════════════════════════════════════ */
.discover-panel {
  display: none;
}
.discover-panel.active { display: block; }
.discover-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.discover-header h2 { font-size: 1.1rem; font-weight: 700; }
.discover-search {
  position: relative;
  flex: 1;
  min-width: 160px;
}
.discover-search input {
  width: 100%;
  padding: 8px 12px 8px 32px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-pri);
  font-size: .84rem;
  font-family: inherit;
  outline: none;
}
.discover-search input:focus { border-color: var(--accent); }
.discover-search svg {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  color: var(--text-dim); pointer-events: none;
}
.discover-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.discover-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  transition: border-color .15s, box-shadow .15s;
}
.discover-card:hover { border-color: var(--border-glow); box-shadow: 0 4px 16px #00000033; }
.discover-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.discover-card-icon {
  width: 36px; height: 36px; border-radius: var(--radius-sm);
  background: var(--bg-panel); border: 1px solid var(--border);
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  overflow: hidden; font-size: 1.1rem;
}
.discover-card-icon img { width: 100%; height: 100%; object-fit: contain; }
.discover-card-name { font-weight: 600; font-size: .9rem; }
.discover-card-desc { font-size: .78rem; color: var(--text-sec); margin-bottom: 10px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.discover-card-footer { display: flex; align-items: center; justify-content: space-between; }

/* ═══════════════════════════════════════════════════════
   IMPORT MODAL ENHANCEMENT
═══════════════════════════════════════════════════════ */
.import-progress {
  margin-top: 12px;
  padding: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: .82rem;
  display: none;
}
.import-progress.active { display: block; }
.import-progress-bar {
  width: 100%;
  height: 6px;
  background: var(--bg-deep);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}
.import-progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width .3s ease;
  width: 0%;
}
.import-results { color: var(--text-sec); font-size: .8rem; }
.import-results .success-text { color: var(--success); }
.import-results .error-text { color: var(--danger); }

/* ═══════════════════════════════════════════════════════
   HEALTH TREND INDICATORS
═══════════════════════════════════════════════════════ */
.health-trend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: .7rem;
  font-family: var(--font-mono);
}
.health-trend.up { color: var(--success); }
.health-trend.down { color: var(--danger); }
.health-trend.flat { color: var(--text-dim); }
.health-trend-arrow { font-size: .65rem; }
.health-last-checked {
  font-size: .72rem;
  color: var(--text-dim);
  font-family: var(--font-mono);
}
.health-uptime { color: var(--text-sec); font-size: .7rem; }

/* ═══════════════════════════════════════════════════════
   LANGUAGE SELECTOR
═══════════════════════════════════════════════════════ */
.lang-selector {
  padding: 5px 8px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-sec);
  font-size: .78rem;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  transition: border-color .15s;
}
.lang-selector:hover { border-color: var(--accent); }
.lang-selector option { background: var(--bg-panel); color: var(--text-pri); }

/* ═══════════════════════════════════════════════════════
   AUTO-BACKUP STATUS
═══════════════════════════════════════════════════════ */
.autobackup-status {
  font-size: .75rem;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}
.autobackup-status .dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--success);
  animation: pulse-dot 2s infinite;
}
.autobackup-status.inactive .dot { background: var(--text-dim); animation: none; }
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: .4; }
}

/* ═══════════════════════════════════════════════════════
   NAV TABS (Addons / Discover)
═══════════════════════════════════════════════════════ */
.nav-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 18px;
  border-bottom: 2px solid var(--border);
}
.nav-tab {
  padding: 10px 20px;
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: .88rem;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: color .15s;
  position: relative;
}
.nav-tab:hover { color: var(--text-sec); }
.nav-tab.active {
  color: var(--accent-hi);
}
.nav-tab.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0; right: 0;
  height: 2px;
  background: var(--accent);
  border-radius: 1px;
}

/* ═══════════════════════════════════════════════════════
   RESTORE BACKUP LIST
═══════════════════════════════════════════════════════ */
.backup-list {
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.backup-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: .8rem;
  cursor: pointer;
  transition: border-color .15s;
}
.backup-list-item:hover { border-color: var(--accent); }
.backup-list-item-info { flex: 1; }
.backup-list-item-time { color: var(--text-dim); font-family: var(--font-mono); font-size: .72rem; }
.backup-list-item-count { color: var(--text-sec); font-size: .78rem; }

/* ═══════════════════════════════════════════════════════
   RESPONSIVE ADDITIONS
═══════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .discover-grid { grid-template-columns: 1fr; }
  .profiles-dropdown { min-width: 200px; }
  .undo-redo-float { bottom: 64px; right: 12px; }
}
@media (max-width: 600px) {
  .type-filter-bar { gap: 4px; }
  .type-filter-btn { padding: 5px 8px; font-size: .72rem; }
  .nav-tab { padding: 8px 12px; font-size: .82rem; }
  .undo-redo-float { bottom: 58px; right: 10px; }
  .undo-redo-float .btn-icon { width: 34px; height: 34px; }
  .profiles-toggle { padding: 6px 8px; font-size: .78rem; }
  .preview-content { grid-template-columns: 1fr; }
}
"""

html = html.replace('</style>', new_css + '\n</style>', 1)

# =====================================================================
# 2. ADD LANGUAGE SELECTOR IN HEADER
# =====================================================================
html = html.replace(
    '''<button class="btn btn-ghost" id="btnRefresh" title="Reload addons from Stremio">↻ Refresh</button>''',
    '''<select class="lang-selector" id="langSelector" title="Language">
      <option value="en">EN</option>
      <option value="ro">RO</option>
    </select>
    <button class="btn btn-ghost" id="btnRefresh" title="Reload addons from Stremio">↻ Refresh</button>'''
)

# =====================================================================
# 3. ADD PROFILES + IMPORT BUTTONS IN HEADER ACTIONS
# =====================================================================
html = html.replace(
    '''<div class="settings-wrapper">
        <button class="settings-toggle" id="settingsToggle"''',
    '''<div class="profiles-wrapper" id="profilesWrapper">
        <button class="profiles-toggle" id="profilesToggle" title="Profiles">📋 Profiles</button>
        <div class="profiles-dropdown" id="profilesDropdown">
          <div class="profiles-dropdown-header">
            <span>📋 Collection Profiles</span>
            <button style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:.9rem;" id="btnNewProfileInline" title="Create new profile">+</button>
          </div>
          <div class="profiles-list" id="profilesList"></div>
          <div class="profiles-dropdown-footer">
            <input type="text" id="newProfileNameInput" placeholder="Profile name..." />
            <button class="btn btn-primary" id="btnSaveProfile" style="padding:6px 12px;font-size:.8rem;">Save</button>
          </div>
        </div>
      </div>
      <button class="btn btn-ghost" id="btnImportURLs" title="Import addons from URLs">📥 Import</button>
      <div class="settings-wrapper">
        <button class="settings-toggle" id="settingsToggle"'''
)

# =====================================================================
# 4. ADD SETTINGS ITEMS (Auto-backup, Discover)
# =====================================================================
html = html.replace(
    '''<button id="btnBackup"><span class="settings-icon">📦</span> Backup</button>
        </div>''',
    '''<button id="btnBackup"><span class="settings-icon">📦</span> Backup</button>
          <button id="btnAutoBackup"><span class="settings-icon">⏰</span> Auto-Backup</button>
        </div>'''
)

# =====================================================================
# 5. ADD NAV TABS + TYPE FILTER + IMPORT BUTTON
# =====================================================================
old_toolbar = '''  <div class="toolbar">
    <div class="search-wrap">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input type="text" id="searchInput" placeholder="Search addons…" />
    </div>
    <div class="seg-ctrl" id="groupCtrl">
      <button data-grp="none" class="active">All</button>
      <button data-grp="type">By Type</button>
    </div>
  </div>'''

new_toolbar = '''  <div class="nav-tabs">
    <button class="nav-tab active" data-tab="addons" id="tabAddons">🔌 Addons</button>
    <button class="nav-tab" data-tab="discover" id="tabDiscover">🔍 Discover</button>
  </div>

  <div id="addonsTabContent">
  <div class="toolbar">
    <div class="search-wrap">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input type="text" id="searchInput" placeholder="Search addons…" />
    </div>
    <div class="seg-ctrl" id="groupCtrl">
      <button data-grp="none" class="active">All</button>
      <button data-grp="type">By Type</button>
    </div>
    <div class="type-filter-bar" id="typeFilterBar">
      <button class="type-filter-btn active" data-type="all">All</button>
      <button class="type-filter-btn" data-type="stream">Stream</button>
      <button class="type-filter-btn" data-type="catalog">Catalog</button>
      <button class="type-filter-btn" data-type="subtitles">Subtitle</button>
      <button class="type-filter-btn" data-type="other">Other</button>
      <span class="filter-count" id="filterCount"></span>
    </div>
  </div>'''

html = html.replace(old_toolbar, new_toolbar)

# =====================================================================
# 6. CLOSE addonsTabContent AND ADD DISCOVER PANEL
# =====================================================================
html = html.replace(
    '''  <div id="addonList">
    <div class="status-panel" id="emptyState">
      <div class="icon">🔌</div>
      <h3>No addons loaded</h3>
      <p>Login or paste your Auth Key above, then click <strong>Load Addons</strong>.</p>
      <br/>
      <button class="btn btn-primary" onclick="loadAddons()">Load Addons</button>
    </div>
  </div>''',
    '''  <div id="addonList">
    <div class="status-panel" id="emptyState">
      <div class="icon">🔌</div>
      <h3>No addons loaded</h3>
      <p>Login or paste your Auth Key above, then click <strong>Load Addons</strong>.</p>
      <br/>
      <button class="btn btn-primary" onclick="loadAddons()">Load Addons</button>
    </div>
  </div>

  <div class="stats-bar" id="autobackupStatusBar" style="display:none">
    <div class="autobackup-status" id="autobackupStatusText">
      <span class="dot"></span>
      <span>Auto-backup active</span>
    </div>
  </div>
  </div>

  <div class="discover-panel" id="discoverPanel">
    <div class="discover-header">
      <h2 id="discoverTitle">🔍 Discover Addons</h2>
      <div class="discover-search">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="discoverSearchInput" placeholder="Search recommendations…" />
      </div>
    </div>
    <div class="discover-grid" id="discoverGrid">
      <div class="status-panel">
        <div class="spinner" style="width:36px;height:36px;border-width:3px;margin:0 auto 16px"></div>
        <p>Loading recommendations…</p>
      </div>
    </div>
  </div>'''
)

# =====================================================================
# 7. ADD FLOATING UNDO/REDO BUTTONS
# =====================================================================
html = html.replace(
    '''<div class="save-bar" id="saveBar">''',
    '''<div class="undo-redo-float" id="undoRedoFloat">
    <button class="btn-icon" id="btnUndo" title="Undo (Ctrl+Z)" disabled>↩</button>
    <button class="btn-icon" id="btnRedo" title="Redo (Ctrl+Y)" disabled>↪</button>
  </div>
<div class="save-bar" id="saveBar">'''
)

# =====================================================================
# 8. ADD NEW MODALS
# =====================================================================
new_modals = '''
<div class="modal-backdrop" id="importModal">
  <div class="modal">
    <h2>📥 Import Addons from URLs</h2>
    <p>Paste addon manifest URLs below, one per line. Each URL should point to a <code>manifest.json</code> file.</p>
    <label>Manifest URLs</label>
    <textarea id="importUrlsTextarea" rows="8" placeholder="https://example.com/addon1/manifest.json&#10;https://example.com/addon2/manifest.json&#10;https://example.com/addon3/manifest.json"></textarea>
    <div class="import-progress" id="importProgress">
      <div class="import-progress-bar"><div class="import-progress-fill" id="importProgressFill"></div></div>
      <div class="import-results" id="importResults"></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal('importModal')">Close</button>
      <button class="btn btn-primary" id="btnDoImport">📥 Import</button>
    </div>
  </div>
</div>

<div class="modal-backdrop" id="autoBackupModal">
  <div class="modal">
    <h2>⏰ Auto-Backup Settings</h2>
    <p>Automatically save snapshots of your addon collection.</p>
    <div class="toggle-row">
      <div class="toggle-info">
        <h3>Enable Auto-Backup</h3>
        <p>Save a snapshot every 5 minutes while on this page.</p>
      </div>
      <label class="switch">
        <input type="checkbox" id="toggleAutoBackup">
        <span class="slider"></span>
      </label>
    </div>
    <div id="autobackupLastInfo" style="font-size:.8rem;color:var(--text-dim);margin-bottom:14px;"></div>
    <label>Restore from Backup</label>
    <div class="backup-list" id="autoBackupList"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal('autoBackupModal')">Close</button>
    </div>
  </div>
</div>
'''

html = html.replace(
    '''<div class="modal-backdrop" id="cinemetaModal">''',
    new_modals + '<div class="modal-backdrop" id="cinemetaModal">'
)

# =====================================================================
# 9. JAVASCRIPT - Add i18n + undo/redo + all new features
# =====================================================================

new_js = """

/* ═══════════════════════════════════════════════════════════════════
   i18n — MULTI-LANGUAGE SUPPORT
═══════════════════════════════════════════════════════════════════ */
const TRANSLATIONS = {
  en: {
    addonManager: 'Addon Manager',
    subtitle: 'Reorder, organize, and manage your Stremio addons',
    refresh: 'Refresh',
    appearance: 'Appearance',
    linkHealth: 'Link Health',
    backup: 'Backup',
    settings: 'Settings',
    searchAddons: 'Search addons…',
    all: 'All',
    byType: 'By Type',
    totalAddons: 'Total Addons',
    pinned: 'Pinned',
    noAddonsLoaded: 'No addons loaded',
    loginOrPaste: 'Login or paste your Auth Key above, then click Load Addons.',
    loadAddons: 'Load Addons',
    saveApply: 'Save & Apply',
    discard: 'Discard',
    unsavedChanges: 'unsaved change(s)',
    login: 'Login',
    logout: 'Logout',
    stremioAccount: 'Stremio Account',
    authKey: 'Auth Key',
    email: 'Email',
    password: 'Password',
    searchPlaceholder: 'Search addons…',
    addonsTab: 'Addons',
    discoverTab: 'Discover',
    discoverTitle: 'Discover Addons',
    searchRecommendations: 'Search recommendations…',
    install: 'Install',
    installed: 'Installed',
    import: 'Import',
    importTitle: 'Import Addons from URLs',
    importDesc: 'Paste addon manifest URLs below, one per line.',
    importPlaceholder: 'https://example.com/addon1/manifest.json',
    doImport: 'Import',
    undo: 'Undo',
    redo: 'Redo',
    profiles: 'Profiles',
    saveProfile: 'Save',
    loadProfile: 'Load',
    deleteProfile: 'Delete',
    collectionProfiles: 'Collection Profiles',
    profileName: 'Profile name...',
    autoBackup: 'Auto-Backup',
    enableAutoBackup: 'Enable Auto-Backup',
    autoBackupDesc: 'Save a snapshot every 5 minutes while on this page.',
    restoreBackup: 'Restore from Backup',
    stream: 'Stream',
    catalog: 'Catalog',
    subtitle: 'Subtitle',
    other: 'Other',
    loading: 'Loading…',
    fetchingCloud: 'Fetching your addon collection from Cloud…',
    loginSuccessful: 'Login successful!',
    loggedOut: 'Logged out',
    pleaseEnterEmailPass: 'Please enter email and password',
    loggingIn: 'Logging in...',
    addonRemoved: 'Addon removed',
    saveFailed: 'Save failed',
    addonOrderSaved: 'Addon order saved!',
    saved: 'Saved!',
    copyFailed: 'Copy failed',
    downloadStarted: 'Download started',
    allLinksHealthy: 'All addon links look healthy',
    linksBroken: 'addon links look broken',
    linkLooksBroken: 'addon link looks broken',
    changesDiscarded: 'Changes discarded',
    confirmRemove: 'Remove',
    removeConfirm: 'This will remove the addon from your collection. You can reinstall it later.',
    coreAddon: 'Core addon cannot be removed',
    coreAddonDisable: 'Core addon cannot be disabled',
    pinToTop: 'Pin to top',
    unpin: 'Unpin',
    enableAddon: 'Enable addon',
    disableAddon: 'Temporarily disable addon',
    copyManifestUrl: 'Copy manifest URL',
    configureAddon: 'Configure addon',
    dragToReorder: 'Drag to reorder',
    addonDisabled: 'Addon disabled (click Save to apply in Stremio)',
    addonReenabled: 'Addon re-enabled (click Save to apply in Stremio)',
    noRecommendations: 'No recommendations available',
    lastChecked: 'Last checked',
    uptime: 'Uptime',
    minutesAgo: 'minutes ago',
    justNow: 'Just now',
    autoBackupActive: 'Auto-backup active',
    autoBackupInactive: 'Auto-backup inactive',
    lastBackup: 'Last backup',
    noBackups: 'No backups available',
    profileExists: 'A profile with this name already exists. Overwrite?',
    profileSaved: 'Profile saved!',
    profileLoaded: 'Profile loaded!',
    profileDeleted: 'Profile deleted!',
    importedX: 'Imported',
    failedY: 'failed',
    invalidUrl: 'Invalid URL',
  },
  ro: {
    addonManager: 'Manager de Addon-uri',
    subtitle: 'Reordonați, organizați și gestionați addon-urile Stremio',
    refresh: 'Reîmprospătare',
    appearance: 'Aspect',
    linkHealth: 'Sănătate Legături',
    backup: 'Backup',
    settings: 'Setări',
    searchAddons: 'Căutați addon-uri…',
    all: 'Toate',
    byType: 'După Tip',
    totalAddons: 'Total Addon-uri',
    pinned: 'Fixate',
    noAddonsLoaded: 'Niciun addon încărcat',
    loginOrPaste: 'Autentificați-vă sau lipiți cheia Auth mai sus, apoi apăsați Încarcă Addon-uri.',
    loadAddons: 'Încarcă Addon-uri',
    saveApply: 'Salvează & Aplică',
    discard: 'Renunță',
    unsavedChanges: 'modificări nesalvate',
    login: 'Autentificare',
    logout: 'Deconectare',
    stremioAccount: 'Cont Stremio',
    authKey: 'Cheie Auth',
    email: 'Email',
    password: 'Parolă',
    searchPlaceholder: 'Căutați addon-uri…',
    addonsTab: 'Addon-uri',
    discoverTab: 'Descoperă',
    discoverTitle: 'Descoperă Addon-uri',
    searchRecommendations: 'Căutați recomandări…',
    install: 'Instalează',
    installed: 'Instalat',
    import: 'Import',
    importTitle: 'Importă Addon-uri din URL-uri',
    importDesc: 'Lipiți URL-urile manifest mai jos, unul pe linie.',
    importPlaceholder: 'https://example.com/addon1/manifest.json',
    doImport: 'Import',
    undo: 'Anulare',
    redo: 'Refacere',
    profiles: 'Profiluri',
    saveProfile: 'Salvează',
    loadProfile: 'Încarcă',
    deleteProfile: 'Șterge',
    collectionProfiles: 'Profiluri de Colecție',
    profileName: 'Nume profil...',
    autoBackup: 'Auto-Backup',
    enableAutoBackup: 'Activează Auto-Backup',
    autoBackupDesc: 'Salvează un snapshot la fiecare 5 minute.',
    restoreBackup: 'Restaurează din Backup',
    stream: 'Stream',
    catalog: 'Catalog',
    subtitle: 'Subtitrare',
    other: 'Altul',
    loading: 'Se încarcă…',
    fetchingCloud: 'Se descarcă colecția de addon-uri din Cloud…',
    loginSuccessful: 'Autentificare reușită!',
    loggedOut: 'Deconectat',
    pleaseEnterEmailPass: 'Introduceți email-ul și parola',
    loggingIn: 'Autentificare...',
    addonRemoved: 'Addon eliminat',
    saveFailed: 'Salvarea a eșuat',
    addonOrderSaved: 'Ordinea addon-urilor salvată!',
    saved: 'Salvat!',
    copyFailed: 'Copierea a eșuat',
    downloadStarted: 'Descărcarea a început',
    allLinksHealthy: 'Toate legăturile addon-urilor sunt sănătoase',
    linksBroken: 'legături de addon-uri par defecte',
    linkLooksBroken: 'legătură de addon pare defectă',
    changesDiscarded: 'Modificările au fost eliminate',
    confirmRemove: 'Elimină',
    removeConfirm: 'Acest lucru va elimina addon-ul din colecția dumneavoastră.',
    coreAddon: 'Addon-ul de bază nu poate fi eliminat',
    coreAddonDisable: 'Addon-ul de bază nu poate fi dezactivat',
    pinToTop: 'Fixează sus',
    unpin: 'Defixează',
    enableAddon: 'Activează addon',
    disableAddon: 'Dezactivează temporar addon',
    copyManifestUrl: 'Copiază URL manifest',
    configureAddon: 'Configurează addon',
    dragToReorder: 'Trage pentru a reordona',
    addonDisabled: 'Addon dezactivat (apăsați Salvare pentru a aplica în Stremio)',
    addonReenabled: 'Addon reactivat (apăsați Salvare pentru a aplica în Stremio)',
    noRecommendations: 'Nu sunt recomandări disponibile',
    lastChecked: 'Ultima verificare',
    uptime: 'Timp de funcționare',
    minutesAgo: 'minute în urmă',
    justNow: 'Chiar acum',
    autoBackupActive: 'Auto-backup activ',
    autoBackupInactive: 'Auto-backup inactiv',
    lastBackup: 'Ultimul backup',
    noBackups: 'Nu sunt backup-uri disponibile',
    profileExists: 'Există deja un profil cu acest nume. Suprascrieți?',
    profileSaved: 'Profil salvat!',
    profileLoaded: 'Profil încărcat!',
    profileDeleted: 'Profil șters!',
    importedX: 'Importate',
    failedY: 'eșuate',
    invalidUrl: 'URL invalid',
  }
};

let currentLang = localStorage.getItem('addonManagerLang') || 'en';

function t(key) {
  return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || (TRANSLATIONS.en[key]) || key;
}

// Language selector event
$('langSelector').addEventListener('change', (e) => {
  currentLang = e.target.value;
  localStorage.setItem('addonManagerLang', currentLang);
  applyTranslations();
});

function applyTranslations() {
  $('langSelector').value = currentLang;
  // Header
  const h1 = document.querySelector('.header-text h1');
  if (h1) h1.textContent = t('addonManager');
  const hp = document.querySelector('.header-text p');
  if (hp) hp.textContent = t('subtitle');
  // Buttons
  const btnRefresh = $('btnRefresh');
  if (btnRefresh) btnRefresh.title = t('refresh');
  $('btnThemeToggle').innerHTML = '<span class="settings-icon">🌓</span> ' + t('appearance');
  $('btnCheckLinks').innerHTML = '<span class="settings-icon">🩺</span> ' + t('linkHealth');
  $('btnBackup').innerHTML = '<span class="settings-icon">📦</span> ' + t('backup');
  $('btnImportURLs').title = t('import');
  $('btnAutoBackup').innerHTML = '<span class="settings-icon">⏰</span> ' + t('autoBackup');
  // Search
  $('searchInput').placeholder = t('searchAddons');
  $('discoverSearchInput').placeholder = t('searchRecommendations');
  // Nav tabs
  $('tabAddons').textContent = '🔌 ' + t('addonsTab');
  $('tabDiscover').textContent = '🔍 ' + t('discoverTab');
  $('discoverTitle').textContent = '🔍 ' + t('discoverTitle');
  // Auth
  const authBtns = document.querySelectorAll('#authModeCtrl button');
  if (authBtns[0]) authBtns[0].textContent = t('stremioAccount');
  if (authBtns[1]) authBtns[1].textContent = t('authKey');
  $('emailInput').placeholder = t('email');
  $('passwordInput').placeholder = t('password');
  $('btnDoLogin').textContent = t('login');
  $('btnLogout').textContent = t('logout');
  // Group control
  const grpBtns = document.querySelectorAll('#groupCtrl button');
  if (grpBtns[0]) grpBtns[0].textContent = t('all');
  if (grpBtns[1]) grpBtns[1].textContent = t('byType');
  // Type filter
  const tfBtns = document.querySelectorAll('.type-filter-btn');
  tfBtns.forEach(b => { if (b.dataset.type) b.textContent = t(b.dataset.type) || b.dataset.type; });
  // Save bar
  $('saveBtnText').textContent = t('saveApply');
  $('btnDiscard').textContent = t('discard');
  // Profiles
  $('profilesToggle').textContent = '📋 ' + t('profiles');
  const pdh = document.querySelector('.profiles-dropdown-header span');
  if (pdh) pdh.textContent = '📋 ' + t('collectionProfiles');
  $('newProfileNameInput').placeholder = t('profileName');
  $('btnSaveProfile').textContent = t('saveProfile');
}

/* ═══════════════════════════════════════════════════════════════════
   UNDO/REDO STACK
═══════════════════════════════════════════════════════════════════ */
const undoStack = [];
const redoStack = [];
const MAX_UNDO = 50;

function pushUndo(op) {
  undoStack.push({ op, timestamp: Date.now() });
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack.length = 0;
  updateUndoRedoUI();
}

function performUndo() {
  if (!undoStack.length) return;
  const entry = undoStack.pop();
  redoStack.push(entry);
  undoOperation(entry.op);
  updateUndoRedoUI();
  renderList();
  markChanged();
}

function performRedo() {
  if (!redoStack.length) return;
  const entry = redoStack.pop();
  undoStack.push(entry);
  redoOperation(entry.op);
  updateUndoRedoUI();
  renderList();
  markChanged();
}

function undoOperation(op) {
  switch (op.type) {
    case 'reorder':
      addons = JSON.parse(JSON.stringify(op.prevAddons));
      disabledAddons = new Set(op.prevDisabled);
      pinned = new Set(op.prevPinned);
      persistDisabledState();
      break;
    case 'remove': {
      const idx = Math.min(op.index, addons.length);
      addons.splice(idx, 0, JSON.parse(JSON.stringify(op.addon)));
      break;
    }
    case 'disable':
      if (op.wasDisabled) disabledAddons.add(op.url);
      else disabledAddons.delete(op.url);
      persistDisabledState();
      break;
    case 'pin':
      if (op.wasPinned) pinned.add(op.url);
      else pinned.delete(op.url);
      break;
    case 'enableDisable':
      disabledAddons.delete(op.url);
      if (op.wasDisabled) disabledAddons.add(op.url);
      persistDisabledState();
      break;
  }
}

function redoOperation(op) {
  switch (op.type) {
    case 'reorder':
      addons = JSON.parse(JSON.stringify(op.nextAddons));
      disabledAddons = new Set(op.nextDisabled);
      pinned = new Set(op.nextPinned);
      persistDisabledState();
      break;
    case 'remove':
      addons = addons.filter(a => (a.transportUrl || a.manifest?.transportUrl) !== op.url);
      break;
    case 'disable':
      if (op.wasDisabled) disabledAddons.delete(op.url);
      else disabledAddons.add(op.url);
      persistDisabledState();
      break;
    case 'pin':
      if (op.wasPinned) pinned.delete(op.url);
      else pinned.add(op.url);
      break;
    case 'enableDisable':
      if (op.wasDisabled) disabledAddons.delete(op.url);
      else disabledAddons.add(op.url);
      persistDisabledState();
      break;
  }
}

function updateUndoRedoUI() {
  $('btnUndo').disabled = undoStack.length === 0;
  $('btnRedo').disabled = redoStack.length === 0;
}

$('btnUndo').addEventListener('click', performUndo);
$('btnRedo').addEventListener('click', performRedo);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    performUndo();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    performRedo();
  }
});

/* ═══════════════════════════════════════════════════════════════════
   TYPE FILTER
═══════════════════════════════════════════════════════════════════ */
let activeTypeFilter = 'all';

document.querySelectorAll('#typeFilterBar .type-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#typeFilterBar .type-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTypeFilter = btn.dataset.type;
    applyFilter();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   NAV TABS (Addons / Discover)
═══════════════════════════════════════════════════════════════════ */
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    $('addonsTabContent').style.display = target === 'addons' ? 'block' : 'none';
    $('discoverPanel').classList.toggle('active', target === 'discover');
    if (target === 'discover') loadRecommendations();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   EXPANDABLE PREVIEW CARDS
═══════════════════════════════════════════════════════════════════ */
const manifestCache = new Map();
const expandedCards = new Set();

function toggleCardPreview(card, url) {
  if (expandedCards.has(url)) {
    expandedCards.delete(url);
    const preview = card.querySelector('.addon-card-preview');
    if (preview) { preview.classList.remove('open'); }
    return;
  }
  expandedCards.add(url);
  const existing = card.querySelector('.addon-card-preview');
  if (existing) existing.remove();

  const preview = document.createElement('div');
  preview.className = 'addon-card-preview open';
  const loading = document.createElement('div');
  loading.className = 'preview-loading';
  loading.innerHTML = '<span class="spinner"></span> <span>' + t('loading') + '</span>';
  preview.appendChild(loading);
  card.appendChild(preview);

  fetchManifestPreview(url).then(data => {
    loading.remove();
    const content = document.createElement('div');
    content.className = 'preview-content';
    const fields = [
      [t('addonId') || 'ID', data.id || '-'],
      [t('version') || 'Version', data.version || '-'],
      ['Description', data.description || '-'],
      ['Types', (data.types || []).join(', ') || '-'],
      ['Catalogs', (data.catalogCount || 0) + ''],
      ['Resources', (data.resourceCount || 0) + ''],
      ['URL', data.url || '-'],
    ];
    fields.forEach(([label, value]) => {
      const lbl = document.createElement('div');
      lbl.className = 'preview-field-label';
      lbl.textContent = label;
      content.appendChild(lbl);
      const val = document.createElement('div');
      val.className = 'preview-field-value';
      val.textContent = String(value);
      content.appendChild(val);
    });
    preview.appendChild(content);
  }).catch(() => {
    loading.remove();
    const errMsg = document.createElement('div');
    errMsg.className = 'preview-loading';
    errMsg.textContent = 'Could not load manifest info';
    errMsg.style.color = 'var(--text-dim)';
    preview.appendChild(errMsg);
  });
}

async function fetchManifestPreview(url) {
  if (manifestCache.has(url)) return manifestCache.get(url);
  try {
    const res = await fetch(url.replace('stremio://', 'https://'), { method: 'GET' });
    if (!res.ok) throw new Error('Fetch failed');
    const manifest = await res.json();
    const data = {
      id: manifest.id || '',
      version: manifest.version || '',
      description: manifest.description || manifest.shortDescription || '',
      types: manifest.types || [],
      catalogCount: (manifest.catalogs || []).length,
      resourceCount: (manifest.resources || []).length,
      url: url,
    };
    manifestCache.set(url, data);
    return data;
  } catch {
    const data = { id: '', version: '', description: '', types: [], catalogCount: 0, resourceCount: 0, url };
    manifestCache.set(url, data);
    return data;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROFILES
═══════════════════════════════════════════════════════════════════ */
let profiles = JSON.parse(localStorage.getItem('addonProfiles') || '{}');

function renderProfilesList() {
  const list = $('profilesList');
  list.innerHTML = '';
  const names = Object.keys(profiles);
  if (names.length === 0) {
    list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-dim);font-size:.82rem;">No profiles yet</div>';
    return;
  }
  names.forEach(name => {
    const item = document.createElement('div');
    item.className = 'profile-item';
    item.dataset.name = name;
    const nameSpan = document.createElement('span');
    nameSpan.className = 'profile-item-name';
    nameSpan.textContent = name;
    item.appendChild(nameSpan);
    const actions = document.createElement('span');
    actions.className = 'profile-item-actions';
    const loadBtn = document.createElement('button');
    loadBtn.textContent = '↩';
    loadBtn.title = t('loadProfile');
    loadBtn.addEventListener('click', (e) => { e.stopPropagation(); loadProfile(name); });
    actions.appendChild(loadBtn);
    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.title = t('deleteProfile');
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteProfile(name); });
    actions.appendChild(delBtn);
    item.appendChild(actions);
    item.addEventListener('click', () => loadProfile(name));
    list.appendChild(item);
  });
}

function saveProfile() {
  const name = $('newProfileNameInput').value.trim();
  if (!name) { toast('Enter a profile name', 'warning'); return; }
  if (profiles[name] && !confirm(t('profileExists'))) return;
  profiles[name] = {
    addons: JSON.parse(JSON.stringify(addons)),
    disabledAddons: [...disabledAddons],
    disabledAddonStore: JSON.parse(JSON.stringify(disabledAddonStore)),
    disabledAddonPositions: JSON.parse(JSON.stringify(disabledAddonPositions)),
    pinned: [...pinned],
    timestamp: Date.now(),
  };
  localStorage.setItem('addonProfiles', JSON.stringify(profiles));
  renderProfilesList();
  $('newProfileNameInput').value = '';
  toast(t('profileSaved'), 'success');
}

function loadProfile(name) {
  const profile = profiles[name];
  if (!profile) return;
  addons = JSON.parse(JSON.stringify(profile.addons));
  disabledAddons = new Set(profile.disabledAddons || []);
  disabledAddonStore = JSON.parse(JSON.stringify(profile.disabledAddonStore || {}));
  disabledAddonPositions = JSON.parse(JSON.stringify(profile.disabledAddonPositions || {}));
  pinned = new Set(profile.pinned || []);
  persistDisabledState();
  original = JSON.parse(JSON.stringify(addons));
  originalDisabledAddons = new Set(disabledAddons);
  renderList();
  hideSaveBar();
  closeProfilesDropdown();
  toast(t('profileLoaded'), 'success');
}

function deleteProfile(name) {
  delete profiles[name];
  localStorage.setItem('addonProfiles', JSON.stringify(profiles));
  renderProfilesList();
  toast(t('profileDeleted'), 'warning');
}

$('btnSaveProfile').addEventListener('click', saveProfile);
$('newProfileNameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveProfile(); });

function toggleProfilesDropdown() {
  const dd = $('profilesDropdown');
  const isOpen = dd.classList.contains('open');
  dd.classList.toggle('open', !isOpen);
  $('profilesToggle').classList.toggle('open', !isOpen);
  if (!isOpen) renderProfilesList();
}
function closeProfilesDropdown() {
  $('profilesDropdown').classList.remove('open');
  $('profilesToggle').classList.remove('open');
}
$('profilesToggle').addEventListener('click', (e) => { e.stopPropagation(); toggleProfilesDropdown(); });
$('btnNewProfileInline').addEventListener('click', (e) => { e.stopPropagation(); $('newProfileNameInput').focus(); });
document.addEventListener('click', (e) => { if (!e.target.closest('.profiles-wrapper')) closeProfilesDropdown(); });

/* ═══════════════════════════════════════════════════════════════════
   COMMUNITY RECOMMENDATIONS (DISCOVER)
═══════════════════════════════════════════════════════════════════ */
let recommendations = [];
let discoverSearchTimeout;

$('discoverSearchInput').addEventListener('input', () => {
  clearTimeout(discoverSearchTimeout);
  discoverSearchTimeout = setTimeout(() => renderDiscoverGrid(), 300);
});

async function loadRecommendations() {
  const grid = $('discoverGrid');
  grid.innerHTML = '<div class="status-panel"><div class="spinner" style="width:36px;height:36px;border-width:3px;margin:0 auto 16px"></div><p>' + t('loading') + '</p></div>';
  try {
    const res = await fetch(API_BASE + '/api/recommendations', {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    recommendations = data.recommendations || data.addons || data || [];
    if (!Array.isArray(recommendations)) recommendations = [];
    renderDiscoverGrid();
  } catch {
    grid.innerHTML = '<div class="status-panel"><div class="icon">⚠️</div><h3>Could not load recommendations</h3><p>The recommendations server may be unavailable.</p></div>';
  }
}

function renderDiscoverGrid() {
  const grid = $('discoverGrid');
  const q = ($('discoverSearchInput').value || '').toLowerCase().trim();
  const filtered = q ? recommendations.filter(r => {
    const name = (r.name || '').toLowerCase();
    const desc = (r.description || '').toLowerCase();
    return name.includes(q) || desc.includes(q);
  }) : recommendations;

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="status-panel"><div class="icon">🔍</div><h3>' + t('noRecommendations') + '</h3></div>';
    return;
  }

  grid.innerHTML = '';
  filtered.forEach(rec => {
    const card = document.createElement('div');
    card.className = 'discover-card';
    const man = rec.manifest || rec;
    const name = man.name || rec.name || 'Unknown';
    const desc = man.description || man.shortDescription || rec.description || '';
    const logo = man.logo || man.icon || rec.logo || '';
    const url = rec.transportUrl || man.transportUrl || rec.url || '';
    const types = man.types || rec.types || [];
    const isInstalled = addons.some(a => (a.transportUrl || a.manifest?.transportUrl) === url);

    const header = document.createElement('div');
    header.className = 'discover-card-header';
    const iconDiv = document.createElement('div');
    iconDiv.className = 'discover-card-icon';
    if (logo) {
      const img = document.createElement('img');
      img.src = logo; img.alt = ''; img.loading = 'lazy';
      img.addEventListener('error', () => { iconDiv.textContent = '🔌'; });
      iconDiv.appendChild(img);
    } else {
      iconDiv.textContent = '🔌';
    }
    header.appendChild(iconDiv);
    const nameDiv = document.createElement('div');
    nameDiv.className = 'discover-card-name';
    nameDiv.textContent = name;
    header.appendChild(nameDiv);
    card.appendChild(header);

    const descDiv = document.createElement('div');
    descDiv.className = 'discover-card-desc';
    descDiv.textContent = desc;
    card.appendChild(descDiv);

    const footer = document.createElement('div');
    footer.className = 'discover-card-footer';
    const tagsSpan = document.createElement('span');
    tagsSpan.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';
    types.slice(0, 3).forEach(tp => {
      const tag = document.createElement('span');
      tag.className = 'tag ' + tagClass(tp);
      tag.textContent = tp;
      tagsSpan.appendChild(tag);
    });
    footer.appendChild(tagsSpan);
    const installBtn = document.createElement('button');
    installBtn.className = 'btn ' + (isInstalled ? 'btn-ghost' : 'btn-primary');
    installBtn.style.cssText = 'padding:5px 14px;font-size:.8rem;';
    installBtn.textContent = isInstalled ? t('installed') : t('install');
    installBtn.disabled = isInstalled;
    if (!isInstalled && url) {
      installBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        installRecommendedAddon(rec, url);
        installBtn.textContent = t('installed');
        installBtn.disabled = true;
        installBtn.className = 'btn btn-ghost';
        installBtn.style.cssText = 'padding:5px 14px;font-size:.8rem;';
      });
    }
    footer.appendChild(installBtn);
    card.appendChild(footer);
    grid.appendChild(card);
  });
}

function installRecommendedAddon(rec, url) {
  const addon = rec.transportUrl ? rec : { transportUrl: url, manifest: rec.manifest || rec };
  addons.push(addon);
  renderList();
  markChanged();
  toast(name + ' ' + t('installed').toLowerCase(), 'success');
}

/* ═══════════════════════════════════════════════════════════════════
   BATCH IMPORT FROM URLS
═══════════════════════════════════════════════════════════════════ */
$('btnImportURLs').addEventListener('click', () => { openModal('importModal'); });
$('btnDoImport').addEventListener('click', async () => {
  const text = $('importUrlsTextarea').value.trim();
  if (!text) { toast('Paste some URLs first', 'warning'); return; }
  const urls = text.split(/[\\n\\r]+/).map(u => u.trim()).filter(u => u.length > 0);
  if (urls.length === 0) { toast('No valid URLs found', 'warning'); return; }

  const progress = $('importProgress');
  const fill = $('importProgressFill');
  const results = $('importResults');
  progress.classList.add('active');
  fill.style.width = '0%';
  results.textContent = '';

  let imported = 0, failed = 0;
  const newAddons = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    fill.style.width = Math.round(((i + 1) / urls.length) * 100) + '%';
    results.textContent = `Processing ${i + 1}/${urls.length}...`;
    try {
      if (!/^https?:\\/\\//i.test(url)) throw new Error(t('invalidUrl'));
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const manifest = await res.json();
      newAddons.push({ transportUrl: url, manifest });
      imported++;
    } catch {
      failed++;
    }
  }

  if (imported > 0) {
    addons.push(...newAddons);
    renderList();
    markChanged();
  }

  results.innerHTML = '<span class="success-text">' + t('importedX') + ': ' + imported + '</span>' +
    (failed > 0 ? ' | <span class="error-text">' + t('failedY') + ': ' + failed + '</span>' : '');
  fill.style.width = '100%';
  toast(imported + ' ' + t('importedX').toLowerCase() + (failed > 0 ? ', ' + failed + ' ' + t('failedY') : ''), imported > 0 ? 'success' : 'error');
});

/* ═══════════════════════════════════════════════════════════════════
   HEALTH DASHBOARD WITH HISTORY
═══════════════════════════════════════════════════════════════════ */
const healthHistory = JSON.parse(localStorage.getItem('addonHealthHistory') || '{}');
let lastHealthCheckTime = parseInt(localStorage.getItem('lastHealthCheckTime') || '0');

const originalRunBrokenLinkCheck = runBrokenLinkCheck;
runBrokenLinkCheck = async function() {
  try {
    const res = await apiFetch('/api/addons/check-links', {});
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Link check failed');
    addonHealth.clear();
    data.checks.forEach(c => {
      addonHealth.set(c.url, !!c.ok);
      // Save to history
      if (!healthHistory[c.url]) healthHistory[c.url] = [];
      healthHistory[c.url].push({ ok: !!c.ok, time: Date.now() });
      if (healthHistory[c.url].length > 10) healthHistory[c.url].shift();
    });
    lastHealthCheckTime = Date.now();
    localStorage.setItem('addonHealthHistory', JSON.stringify(healthHistory));
    localStorage.setItem('lastHealthCheckTime', String(lastHealthCheckTime));
    renderList();
    const broken = data.checks.filter(c => !c.ok && !c.skipped).length;
    toast(broken ? (broken + ' ' + t('linksBroken')) : t('allLinksHealthy'), broken ? 'warning' : 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
};

function getHealthTrend(url) {
  const history = healthHistory[url];
  if (!history || history.length < 2) return 'flat';
  const recent = history.slice(-3);
  const last = recent[recent.length - 1].ok;
  const prev = recent[0].ok;
  if (last && !prev) return 'up';
  if (!last && prev) return 'down';
  return 'flat';
}

function getHealthUptime(url) {
  const history = healthHistory[url];
  if (!history || history.length === 0) return null;
  const ok = history.filter(h => h.ok).length;
  return Math.round((ok / history.length) * 100);
}

function getLastCheckedAgo() {
  if (!lastHealthCheckTime) return null;
  const mins = Math.floor((Date.now() - lastHealthCheckTime) / 60000);
  if (mins < 1) return t('justNow');
  return mins + ' ' + t('minutesAgo');
}

/* ═══════════════════════════════════════════════════════════════════
   AUTO-BACKUP SCHEDULER
═══════════════════════════════════════════════════════════════════ */
let autoBackupEnabled = localStorage.getItem('autoBackupEnabled') === 'true';
let autoBackupInterval = null;
const AUTO_BACKUP_KEY = 'autoBackupSnapshots';
let autoBackupSnapshots = JSON.parse(localStorage.getItem(AUTO_BACKUP_KEY) || '[]');

function startAutoBackup() {
  stopAutoBackup();
  autoBackupInterval = setInterval(() => {
    createAutoBackupSnapshot();
  }, 5 * 60 * 1000); // 5 minutes
}

function stopAutoBackup() {
  if (autoBackupInterval) { clearInterval(autoBackupInterval); autoBackupInterval = null; }
}

function createAutoBackupSnapshot() {
  if (addons.length === 0) return;
  const snapshot = {
    addons: JSON.parse(JSON.stringify(addons)),
    disabledAddons: [...disabledAddons],
    timestamp: Date.now(),
    count: addons.length,
  };
  autoBackupSnapshots.push(snapshot);
  if (autoBackupSnapshots.length > 20) autoBackupSnapshots = autoBackupSnapshots.slice(-20);
  localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(autoBackupSnapshots));
  updateAutoBackupStatus();
}

function updateAutoBackupStatus() {
  const bar = $('autobackupStatusBar');
  const text = $('autobackupStatusText');
  if (autoBackupEnabled) {
    bar.style.display = 'flex';
    text.classList.remove('inactive');
    const lastSnap = autoBackupSnapshots[autoBackupSnapshots.length - 1];
    if (lastSnap) {
      const ago = Math.floor((Date.now() - lastSnap.timestamp) / 60000);
      text.innerHTML = '<span class="dot"></span><span>' + t('autoBackupActive') + ' — ' + t('lastBackup') + ': ' + (ago < 1 ? t('justNow') : ago + ' ' + t('minutesAgo')) + '</span>';
    } else {
      text.innerHTML = '<span class="dot"></span><span>' + t('autoBackupActive') + '</span>';
    }
  } else {
    bar.style.display = 'none';
  }
}

$('toggleAutoBackup').addEventListener('change', (e) => {
  autoBackupEnabled = e.target.checked;
  localStorage.setItem('autoBackupEnabled', String(autoBackupEnabled));
  if (autoBackupEnabled) { startAutoBackup(); createAutoBackupSnapshot(); }
  else stopAutoBackup();
  updateAutoBackupStatus();
});

$('btnAutoBackup').addEventListener('click', () => {
  $('toggleAutoBackup').checked = autoBackupEnabled;
  // Show last backup info
  const info = $('autobackupLastInfo');
  const lastSnap = autoBackupSnapshots[autoBackupSnapshots.length - 1];
  if (lastSnap) {
    const ago = Math.floor((Date.now() - lastSnap.timestamp) / 60000);
    info.textContent = t('lastBackup') + ': ' + (ago < 1 ? t('justNow') : ago + ' ' + t('minutesAgo'));
  } else {
    info.textContent = t('noBackups');
  }
  // Render backup list
  const list = $('autoBackupList');
  list.innerHTML = '';
  const sorted = [...autoBackupSnapshots].reverse();
  if (sorted.length === 0) {
    list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-dim);font-size:.82rem;">' + t('noBackups') + '</div>';
  } else {
    sorted.forEach((snap, i) => {
      const item = document.createElement('div');
      item.className = 'backup-list-item';
      const infoDiv = document.createElement('div');
      infoDiv.className = 'backup-list-item-info';
      const timeDiv = document.createElement('div');
      timeDiv.className = 'backup-list-item-time';
      timeDiv.textContent = new Date(snap.timestamp).toLocaleString();
      infoDiv.appendChild(timeDiv);
      const countDiv = document.createElement('div');
      countDiv.className = 'backup-list-item-count';
      countDiv.textContent = snap.count + ' addons';
      infoDiv.appendChild(countDiv);
      item.appendChild(infoDiv);
      item.addEventListener('click', () => {
        addons = JSON.parse(JSON.stringify(snap.addons));
        disabledAddons = new Set(snap.disabledAddons || []);
        renderList();
        markChanged();
        closeModal('autoBackupModal');
        toast('Backup restored!', 'success');
      });
      list.appendChild(item);
    });
  }
  openModal('autoBackupModal');
  closeSettingsDropdown();
});

// Initialize auto-backup
if (autoBackupEnabled) startAutoBackup();
updateAutoBackupStatus();

/* ═══════════════════════════════════════════════════════════════════
   ENHANCED applyFilter WITH TYPE FILTER & COUNT
═══════════════════════════════════════════════════════════════════ */
const originalApplyFilter = applyFilter;
applyFilter = function() {
  const q = $('searchInput').value.toLowerCase().trim();
  const cards = addonList.querySelectorAll('.addon-card');
  let visibleCount = 0;
  cards.forEach(card => {
    const nameMatch = card.dataset.name.includes(q);
    const url = card.dataset.url || '';
    const urlMatch = url.toLowerCase().includes(q);
    let typeMatch = true;
    if (activeTypeFilter !== 'all') {
      const cardTypes = (card.dataset.types || '').split(',');
      typeMatch = cardTypes.includes(activeTypeFilter);
    }
    const hide = !nameMatch && !urlMatch || !typeMatch;
    card.classList.toggle('hidden', hide);
    if (!hide) visibleCount++;
  });
  $('filterCount').textContent = visibleCount + '/' + (addons.length || 0);
};

/* ═══════════════════════════════════════════════════════════════════
   ENHANCED buildCard — ADD PREVIEW + TYPE DATA + HEALTH TREND
═══════════════════════════════════════════════════════════════════ */
const originalBuildCard = buildCard;
buildCard = function(addon, idx) {
  const url = addon.transportUrl || addon.manifest?.transportUrl || '';
  const man = addon.manifest || addon;
  const types = [...(man.types || []), ...(man.resources || []).map(r => typeof r === 'string' ? r : r.name || '')];
  const typeStr = [...new Set(types)].join(',');

  const card = originalBuildCard(addon, idx);
  card.dataset.types = typeStr;

  // Add type to dataset for search
  card.dataset.url = url;

  // Make card expandable on click (not on buttons)
  card.addEventListener('click', (e) => {
    if (e.target.closest('.card-actions') || e.target.closest('.drag-handle')) return;
    toggleCardPreview(card, url);
  });

  // Add health trend indicator to name
  if (addonHealth.get(url) !== undefined) {
    const trend = getHealthTrend(url);
    const uptime = getHealthUptime(url);
    const nameDiv = card.querySelector('.addon-name');
    if (nameDiv && (trend !== 'flat' || uptime !== null)) {
      const trendSpan = document.createElement('span');
      trendSpan.className = 'health-trend ' + trend;
      const arrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
      trendSpan.innerHTML = arrow;
      if (uptime !== null) {
        trendSpan.textContent += ' ' + uptime + '%';
      }
      nameDiv.appendChild(trendSpan);
    }
  }

  return card;
};

/* ═══════════════════════════════════════════════════════════════════
   UNDO/REDO INTEGRATION INTO EXISTING FUNCTIONS
═══════════════════════════════════════════════════════════════════ */
const originalSyncOrderFromDOM = syncOrderFromDOM;
syncOrderFromDOM = function() {
  const prevAddons = JSON.parse(JSON.stringify(addons));
  const prevDisabled = new Set(disabledAddons);
  const prevPinned = new Set(pinned);
  originalSyncOrderFromDOM();
  pushUndo({
    type: 'reorder',
    prevAddons, prevDisabled, prevPinned,
    nextAddons: JSON.parse(JSON.stringify(addons)),
    nextDisabled: new Set(disabledAddons),
    nextPinned: new Set(pinned),
  });
};

const originalTogglePin = togglePin;
togglePin = function(url) {
  const wasPinned = pinned.has(url);
  const prevAddons = JSON.parse(JSON.stringify(addons));
  originalTogglePin(url);
  pushUndo({ type: 'pin', url, wasPinned });
};

const originalToggleAddonDisabled = toggleAddonDisabled;
toggleAddonDisabled = function(url) {
  const wasDisabled = disabledAddons.has(url);
  originalToggleAddonDisabled(url);
  pushUndo({ type: 'enableDisable', url, wasDisabled });
};

const originalRemoveAddon = removeAddon;
removeAddon = function(url) {
  const idx = addons.findIndex(a => (a.transportUrl || a.manifest?.transportUrl) === url);
  const addon = addons[idx];
  originalRemoveAddon(url);
  pushUndo({ type: 'remove', url, addon: JSON.parse(JSON.stringify(addon)), index: idx });
};

// Also update stats bar to show health info
const originalUpdateStats = updateStats;
updateStats = function() {
  originalUpdateStats();
  const bar = $('statsBar');
  // Add last checked info
  const lastChecked = getLastCheckedAgo();
  if (lastChecked && addonHealth.size > 0) {
    let existing = bar.querySelector('.health-last-checked');
    if (!existing) {
      existing = document.createElement('div');
      existing.className = 'stat';
      bar.appendChild(existing);
    }
    existing.className = 'stat';
    existing.innerHTML = '<span style="color:var(--text-dim);font-size:.72rem;">' + t('lastChecked') + ':</span> <span class="stat-val" style="font-size:.72rem;">' + lastChecked + '</span>';
  }
};

/* ═══════════════════════════════════════════════════════════════════
   INIT TRANSLATIONS ON LOAD
═══════════════════════════════════════════════════════════════════ */
applyTranslations();
updateUndoRedoUI();

"""

html = html.replace('</script>', new_js + '</script>', 1)

# =====================================================================
# 10. UPDATE THE CLOSING </div> structure
# =====================================================================
# We already closed addonsTabContent in step 6, so we just need the closing tag structure to be right

with open('/home/z/my-project/addon-project/configure.html', 'w') as f:
    f.write(html)

print('File written successfully')
print('File size:', len(html), 'bytes')
print('Has DOCTYPE:', html.startswith('<!DOCTYPE'))
print('Has closing html:', '</html>' in html)
