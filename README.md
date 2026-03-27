# 🎬 Stremio Addon Manager

A Stremio addon that lets you **reorder and manage** your installed addons through a beautiful drag-and-drop interface — all without leaving Stremio.

---

## 🚀 Why?

In Stremio, **addon order = stream priority**. The first addon that provides a stream is shown first. Traditionally, reordering requires uninstalling and reinstalling addons in the desired order.

This addon solves that — instantly.

---

## ✨ Features

| Feature | Status |
|---|---|
| Login with Stremio Account (Email/Password) | ✅ |
| Drag-and-drop reordering | ✅ |
| Pin addons to the top | ✅ |
| Remove addons (protected for core addons) | ✅ |
| Copy Addon Manifest URL | ✅ |
| Open Addon Configuration | ✅ |
| Search / filter by name | ✅ |
| Group by type (stream, catalog, meta, subtitles) | ✅ |
| Backup & Restore (JSON) | ✅ |
| Cloud Sync (cross-device) | ✅ |
| Addon Link Health Checker | ✅ |
| Cinemeta Patches (remove search, catalogs, metadata) | ✅ |
| Secure Session Cookies (HMAC-signed, HttpOnly) | ✅ |
| Rate Limiting (login & save operations) | ✅ |
| Structured Remote Logging | ✅ |

> 🔒 **Security Note:**  
> Your Stremio email and password are never stored. They are only used once to securely obtain your Auth Key from Stremio's API. Only the Auth Key is saved — as a signed, HttpOnly session cookie that expires after 30 minutes.

---

## 📦 Requirements

- Node.js 18+ (if self-hosting)
- A Stremio account  
  *(Email & Password or Auth Key)*

---

## 🌐 Deployment

### Vercel (Recommended)

Free, fast, and no server maintenance required.

#### CLI Method

```bash
npm install -g vercel

git clone https://github.com/C0st1/Addon-Manager.git
cd Addon-Manager

vercel        # preview
vercel --prod # production
```

Your app will be available at:
```
https://your-app.vercel.app
```

Install in Stremio:
```
https://your-app.vercel.app/manifest.json
```

---

#### Dashboard Method

1. Push the project to GitHub  
2. Go to https://vercel.com  
3. Import your repository  
4. Click **Deploy**

---

### 🖥 Local Setup

```bash
git clone https://github.com/C0st1/Addon-Manager.git
cd Addon-Manager
npm install
npm start
```

For development with auto-restart:
```bash
npm run dev
```

Open:
```
http://localhost:7000
```

Install in Stremio:
```
http://localhost:7000/manifest.json
```

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SESSION_SECRET` | Recommended | Secret used to sign session cookies. Defaults to a dev-only value — **always set this in production**. |
| `PUBLIC_API_BASE` | Optional | Override the base URL injected into the configure page (auto-detected from the request if not set). |
| `LOG_INGEST_URL` | Optional | HTTP endpoint to receive structured JSON log events. If not set, logging is console-only. |

---

## 🧭 Usage

1. Install the addon in Stremio  
2. Open **Addon Manager → Configure**  
3. Log in using:
   - Email & Password  
   - OR Auth Key (manual mode)  
4. Your addons will load automatically

---

### 🔄 Reordering
Drag the ⠿ handle to reorder addons.  

### 📌 Pinning
Pin addons to keep them at the top regardless of drag operations.

### 🔗 Quick Actions
- Copy manifest URL  
- Open addon configuration  
- Search and filter addons  

### 🩺 Link Health Check
Check whether your installed addons are reachable. The health checker pings each addon's transport URL and reports its status. Local addons and hosts that reject `HEAD` requests are marked as skipped rather than failed.

### 🎬 Cinemeta Patches
Fine-tune Cinemeta's behavior without uninstalling it:
- **Remove Search** — strips search catalogs and the `search` resource
- **Remove Popular/New/Featured Catalogs** — hides trending catalog rows
- **Remove Metadata** — removes the `meta` resource to let another addon handle metadata

### 🗑 Removing
Remove addons safely.

> ⚠️ Core addons (e.g. Cinemeta, Local Files, Addon Manager) are protected.

---

## 💾 Backup & Restore

- Export your setup as JSON  
- Restore anytime on any device  

---

## 🔐 Auth Key (Manual Method)

If you prefer not to use your credentials:

1. Open Stremio
2. Press `F12` → Console
3. Run:
   ```js
   console.log(JSON.parse(localStorage.getItem('profile')).auth.key)
   ```
4. Paste the output into the Addon Manager

---

## 🔒 Security

### Session Cookies
After login, the Auth Key is stored in a **signed, HttpOnly session cookie** (not `localStorage`). Cookies are:
- HMAC-SHA256 signed using `SESSION_SECRET`
- Set with `HttpOnly` and `SameSite=Lax`
- `Secure` flag enabled outside of local development
- Expire after **30 minutes**

### Rate Limiting
The API enforces in-memory rate limits to prevent abuse:
- **Login** — 10 attempts per IP per minute
- **Save addons** — 50 requests per IP per minute

---

## 📁 Project Structure

```
addon-manager/
├── configure.html
├── vercel.json
├── manifest.webmanifest
├── sw.js
├── package.json
├── api/
│   ├── manifest.js
│   ├── configure.js
│   ├── health.js
│   ├── login.js
│   ├── session.js
│   └── addons/
│       ├── get.js
│       ├── set.js
│       └── check-links.js
├── lib/
│   ├── stremioAPI.js
│   ├── auth.js
│   ├── rateLimiter.js
│   ├── logger.js
│   └── applyCinemetaPatches.js
├── tests/
│   └── applyCinemetaPatches.test.js
└── README.md
```

---

## 🧪 Tests

```bash
npm test
```

Tests cover `applyCinemetaPatches` — verifying that search, catalog, and metadata removal options work correctly without corrupting addon identity fields.

---

## 🛠 Troubleshooting

**Login fails**  
→ Verify credentials or use Auth Key if using Google/Facebook login.

**Blank configure page**  
→ Open:
```
https://your-app.vercel.app/configure
```

**Changes not applying**  
→ Restart Stremio after saving.

**Addon shows as unreachable in health check**  
→ Some hosts block `HEAD` requests — these are automatically skipped and treated as healthy. If an addon is truly down, check the transport URL directly in your browser.

---

## 📜 License

MIT
