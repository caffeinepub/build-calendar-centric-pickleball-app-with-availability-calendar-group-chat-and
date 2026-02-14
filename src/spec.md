# Specification

## Summary
**Goal:** Enhance the app’s PWA experience with offline support, improved caching, an iOS splash screen, clearer install UX, and better standalone-mode layout polish (excluding app shortcuts).

**Planned changes:**
- Add and register a service worker that precaches the app shell and provides a clear offline fallback UI when the network is unavailable.
- Implement a caching strategy that speeds up repeat visits (precache core assets + runtime caching rules) while avoiding indefinitely stale HTML and avoiding unsafe caching of authenticated flows.
- Add iOS PWA splash/startup images and required `apple-touch-startup-image` metadata/link tags in `frontend/index.html`, referencing static assets in `frontend/public/assets/generated`.
- Improve install prompt UX with a prominent install call-to-action, using `beforeinstallprompt` where available and providing clear iOS installation instructions where it is not; hide this UX in standalone mode.
- Polish standalone mobile layout to respect safe-area insets, prevent awkward overflow/double scrolling, and ensure header/navigation spacing looks correct.

**User-visible outcome:** Users can install the app more easily, see a proper iOS splash screen on launch, experience faster repeat loads, and use the app with a clear offline state and improved standalone-mode layout on mobile.
