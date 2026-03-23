```markdown
# 🎬 Stremio Addon Manager

A Stremio addon that lets you **reorder and manage** your installed addons through a beautiful drag-and-drop configure page — all without leaving Stremio.

---

## Why?

In Stremio, **addon order = stream priority**. The first addon that provides a stream is shown first. Currently, reordering means uninstalling and reinstalling in the right order. This addon fixes that.

---

## Features

| Feature | Status |
|---|---|
| Login with Stremio Account (Email/Password) | ✅ |
| Drag-and-drop reordering | ✅ |
| Move Up / Move Down buttons (keyboard/mobile) | ✅ |
| Pin addons to the top | ✅ |
| Copy Addon Manifest URL | ✅ |
| Open Addon Configuration | ✅ |
| Remove addons (Safeguarded for core addons) | ✅ |
| Search / filter by name | ✅ |
| Group by type (stream, catalog, meta, subtitles) | ✅ |
| Backup & Restore as JSON | ✅ |
| Cloud Sync (cross-device sync) | ✅ |
| Dark theme, responsive layout | ✅ |

> **Security Note:** Your Stremio email and password are **never** saved. They are used once to securely fetch your Auth Key from Stremio's API. Only the Auth Key is saved in your browser's local storage to keep you logged in.

---

## Requirements

- **Node.js 18+**
- A **Stremio Account** (Email & Password) OR your Stremio **Auth Key**

---

## Deployment

### 🚀 Option 1 — Vercel (recommended, free, no server needed)

#### Via Vercel CLI

```bash
# Install CLI
npm install -g vercel

# Clone and deploy
git clone [https://github.com/yourname/stremio-addon-manager.git](https://github.com/yourname/stremio-addon-manager.git)
cd stremio-addon-manager
vercel        # preview
vercel --prod # production
```

You'll get a URL like `https://stremio-addon-manager.vercel.app`.

**Install in Stremio:** `https://your-app.vercel.app/manifest.json`

#### Via Vercel Dashboard (no CLI)

1. Push this repo to GitHub
2. [vercel.com](https://vercel.com) → Add New Project → import your repo
3. Leave all settings as-is (no build command, no output directory)
4. Click **Deploy**

---

### 🖥 Option 2 — Run locally

```bash
git clone [https://github.com/yourname/stremio-addon-manager.git](https://github.com/yourname/stremio-addon-manager.git)
cd stremio-addon-manager
npm install
npm start
# → http://localhost:7000
```

**Install in Stremio:** `http://localhost:7000/manifest.json`

---

### Finding your auth key (Manual Method)

If you prefer not to log in with your email and password, you can extract your Auth Key directly from Stremio:

1. Open Stremio (Web or Desktop)
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Paste the following command and press Enter:
   `console.log(JSON.parse(localStorage.getItem('profile')).auth.key)`
5. Copy the output (without quotes) and paste it into the Addon Manager.

---

## Usage

1. Install the addon in Stremio using your manifest URL
2. Find **Addon Manager** in your addon list
3. Click **⚙ Configure**
4. **Log in** using your Stremio Email and Password, OR switch to the **Auth Key** tab and paste your key
5. Your addons will automatically load from the cloud

### Reordering
Drag the ⠿ handle to reorder. Use **▲ / ▼** buttons for keyboard/mobile.

### Pinning
Click 📌 to pin an addon to the top — it won't move during drag operations.

### Useful Links
Click 🔗 to copy the addon's manifest URL to your clipboard. If an addon is configurable, click ⚙️ to open its configuration page in a new browser tab.

### Removing
Click 🗑 to permanently remove an addon. The Addon Manager itself, Cinemeta, and Local Files are protected and cannot be removed to prevent breaking your Stremio setup.

### Backup & Restore
Click **📦 Backup** to export your collection as JSON, download it, or paste a backup to restore.

---

## Project Structure

```text
stremio-addon-manager/
├── index.js              # Local Express server entry point
├── configure.html        # Interactive management UI (single HTML file)
├── vercel.json           # Vercel routing config
├── api/
│   ├── manifest.js       # GET  /manifest.json  (serverless)
│   ├── configure.js      # GET  /configure      (serverless)
│   ├── health.js         # GET  /api/health     (serverless)
│   ├── login.js          # POST /api/login      (serverless)
│   └── addons/
│       ├── get.js        # POST /api/addons/get (serverless)
│       └── set.js        # POST /api/addons/set (serverless)
├── lib/
│   └── stremioAPI.js     # Stremio cloud API helpers
├── package.json
└── README.md
```

---

## Troubleshooting

**Login Failed / Invalid Credentials**
→ Double-check your Stremio email and password. If you use Facebook/Google login for Stremio, you will need to use the Manual Auth Key method instead.

**Configure page shows blank**
→ Open `https://your-app.vercel.app/configure` directly in a browser to check for errors.

**Changes don't seem to apply**
→ Some Stremio versions need a restart. Close and reopen Stremio after saving.

---

## License

MIT
```
