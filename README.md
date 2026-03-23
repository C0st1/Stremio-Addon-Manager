# 🎬 Stremio Addon Manager

A self-hosted Stremio addon that lets you **reorder, enable/disable, and manage** your installed Stremio addons through a beautiful drag-and-drop configure page — all without leaving Stremio.

![Stremio Addon Manager UI](https://via.placeholder.com/860x480/0f0f1e/7c5cbf?text=Stremio+Addon+Manager)

---

## Why?

In Stremio, **addon order = stream priority**. The first addon that provides a stream for a movie/show is shown first. If you want Torrentio above everything else, it needs to be installed first — but currently there's no in-app way to reorder addons without uninstalling and reinstalling them.

This addon solves that with a full management UI accessible via the **⚙ Configure** button.

---

## Features

| Feature | Status |
|---|---|
| Drag-and-drop reordering | ✅ |
| Move Up / Move Down buttons (keyboard/mobile) | ✅ |
| Enable / Disable addons (without removing) | ✅ |
| Pin addons to the top | ✅ |
| Remove addons | ✅ |
| Search / filter by name | ✅ |
| Group by type (stream, catalog, meta, subtitles) | ✅ |
| Backup & Restore as JSON | ✅ |
| Local API (Stremio desktop) | ✅ |
| Cloud API (cross-device sync with auth key) | ✅ |
| Dark theme, responsive layout | ✅ |

---

## Requirements

- **Node.js** 14 or higher
- **Stremio desktop** running locally (for local API mode)
- Or: your Stremio **auth key** (for cloud API mode)

---

## Installation

### 1. Clone and install

```bash
git clone https://github.com/yourname/stremio-addon-manager.git
cd stremio-addon-manager
npm install
```

### 2. Start the server

```bash
npm start
# → Server running at http://localhost:7000
```

By default the server runs on port **7000**. Override with:
```bash
PORT=8080 npm start
```

For remote deployment (Heroku, Railway, Render, etc.):
```bash
PUBLIC_URL=https://your-app.railway.app npm start
```

### 3. Install in Stremio

1. Open **Stremio** desktop or web
2. Go to the **Addons** section (🧩 icon)
3. Click **+ Install from URL** (or the search bar — paste and press Enter)
4. Paste: `http://localhost:7000/manifest.json`
5. Confirm installation

### 4. Open the manager

1. Find **Addon Manager** in your installed addons list
2. Click the **⚙ Configure** button
3. The management UI opens — your addons are loaded automatically

---

## Usage Guide

### Reordering

**Drag and drop** any addon card to a new position using the ⠿ handle on the left.

Use the **▲ / ▼ arrow buttons** on each card for mouse-free reordering.

### Pinning

Click 📌 on an addon to **pin it to the top**. Pinned addons cannot be moved by dragging.

### Disabling

Click **●** on an addon to temporarily disable it (● = active, ◯ = disabled).  
Disabled addons are excluded from the saved collection but kept in the UI so you can re-enable them.

### Removing

Click 🗑 to remove an addon from your collection. The Addon Manager itself cannot be removed.

### Saving

After making changes, a **Save bar** appears at the bottom. Click **Save & Apply** to commit changes to Stremio.

> ⚠️ You may need to restart Stremio or navigate away and back for the new order to take full effect.

### Backup & Restore

Click **📦 Backup** in the header to:
- **Copy** your current collection as JSON
- **Download** it as a `.json` file
- **Restore** a previously saved backup by pasting it in the text area

### Cloud Sync

To sync across devices:
1. Find your **auth key** in Stremio settings or `server-settings.json`
   - Windows: `%APPDATA%\stremio\server-settings.json`
   - macOS: `~/Library/Application Support/stremio/server-settings.json`
   - Linux: `~/.config/stremio/server-settings.json`
2. Paste the auth key into the **Auth Key** field at the top
3. Switch the source selector to **Cloud** or **Both**
4. Your changes will sync to all devices logged into that account

---

## Project Structure

```
stremio-addon-manager/
├── index.js              # Express server + addon manifest
├── configure.html        # Interactive management UI (single-file)
├── lib/
│   └── stremioAPI.js     # Local + cloud Stremio API helpers
├── package.json
└── README.md
```

---

## API Reference

The Express server exposes these endpoints (used internally by the configure page):

| Endpoint | Method | Description |
|---|---|---|
| `/manifest.json` | GET | Stremio addon manifest |
| `/configure` | GET | Interactive management UI |
| `/api/health` | GET | Health check + local server reachability |
| `/api/addons/get` | POST | Fetch addon collection |
| `/api/addons/set` | POST | Save addon collection |

---

## Troubleshooting

### "Could not load addons"

- Make sure **Stremio desktop is running** (the local API at `127.0.0.1:11470` must be available)
- Try switching to **Cloud** source and entering your auth key
- Check that nothing is blocking port 11470 (firewall, antivirus)

### Configure page shows blank / can't connect

- Verify the addon server is running: open `http://localhost:7000/configure` in a browser
- If using a remote deployment, make sure `PUBLIC_URL` env var is set correctly

### Stremio on Android / TV

The local Stremio API at `127.0.0.1:11470` is only available on the **desktop** app. On Android/TV, use **Cloud** mode with your auth key.

### Changes don't seem to apply

Some Stremio versions require a restart for addon order changes to take effect. Close and reopen Stremio after saving.

---

## License

MIT — free to use, modify, and distribute.
