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

> 🔒 **Security Note:**  
Your Stremio email and password are never stored. They are only used once to securely obtain your Auth Key from Stremio’s API. Only the Auth Key is saved locally in your browser.

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

git clone https://github.com/yourname/stremio-addon-manager.git
cd stremio-addon-manager

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
git clone https://github.com/yourname/stremio-addon-manager.git
cd stremio-addon-manager
npm install
npm start
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

## 📁 Project Structure

```
stremio-addon-manager/
├── index.js
├── configure.html
├── vercel.json
├── api/
│   ├── manifest.js
│   ├── configure.js
│   ├── health.js
│   ├── login.js
│   └── addons/
│       ├── get.js
│       └── set.js
├── lib/
│   └── stremioAPI.js
├── package.json
└── README.md
```

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

---

## 📜 License

MIT
