

## Progressive Web App (PWA) Setup

### Important Notes
- This is a **React/Vite** project (not Laravel). The PWA will be implemented accordingly.
- PWA features (offline support, install prompt) will **only work in the published/deployed version**, not in the Lovable editor preview.
- Since you primarily want installability + standalone mode, we'll use a **simple manifest approach** plus a lightweight service worker.

### Changes

**1. Create `public/manifest.json`**
- App name: "Credit Scorewala"
- Theme/background colors matching the app
- Icons at 192x192 and 512x512 (we'll generate simple placeholder icons or use existing branding)
- `display: "standalone"`, `start_url: "/"`

**2. Update `index.html`**
- Link the manifest: `<link rel="manifest" href="/manifest.json">`
- Add iOS meta tags:
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
  - `<meta name="apple-mobile-web-app-title" content="Credit Scorewala">`
  - `<link rel="apple-touch-icon" href="/icon-192.png">`
- Add `<meta name="theme-color" content="#...">`

**3. Create `public/sw.js`** (lightweight service worker)
- Basic cache-first strategy for static assets
- Network-first for API calls
- Minimal offline fallback

**4. Add install prompt logic in `src/components/InstallPrompt.tsx`**
- Listen for `beforeinstallprompt` event
- Show a custom "Install App" button/banner
- Handle the prompt acceptance flow
- Guard against iframe/preview contexts (won't register SW in Lovable preview)

**5. Update `src/main.tsx`**
- Conditionally register service worker (skip in iframe/preview)

**6. Render `<InstallPrompt />` in `src/App.tsx`**

### Technical Details
- No `vite-plugin-pwa` needed — simple manual approach
- SW registration is guarded: won't activate in Lovable preview iframes
- iOS doesn't support `beforeinstallprompt`, so we rely on meta tags + apple-touch-icon for "Add to Home Screen"
- For icons, we'll create simple SVG-based PNGs or you can provide custom icons later

