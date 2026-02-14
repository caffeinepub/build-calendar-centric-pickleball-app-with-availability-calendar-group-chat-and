# Specification

## Summary
**Goal:** Update the PWA web manifest so all home-screen icon entries use the provided external image URL for their `src`.

**Planned changes:**
- Edit `frontend/public/manifest.webmanifest` to set the `src` for the 192x192, 512x512, and 512x512 maskable icon entries to the provided external URL.
- Remove any remaining `/assets/generated/pwa-icon...` references from the manifest `icons` array (while leaving favicon and Apple touch icon unchanged).

**User-visible outcome:** When installing/adding the app to the home screen, the app icon is sourced from the provided external URL for all required PWA icon sizes.
