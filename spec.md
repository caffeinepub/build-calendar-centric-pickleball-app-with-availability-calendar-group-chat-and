# Somers Scheduler

## Current State
ChatPanel.tsx has a compose form with: text input, paperclip (image attach), and send button. Messages render in ThreadedPostTree. The chat background uses a CSS linear gradient (dark navy to near-black). No GIF support exists.

## Requested Changes (Diff)

### Add
- `GifPicker.tsx` component: popup panel above the input bar with a search field; shows Giphy trending GIFs by default, search results when a term is typed. Grid layout, dark mode, mobile-friendly.
- GIF button in the compose row (between paperclip and send): small "GIF" text button that toggles the GifPicker popup.
- GIF sending: tapping a GIF in the picker inserts the Giphy CDN URL as a chat message (content = gif URL string), closes the picker, and posts via the existing `createPost` mutation. No backend changes.
- GIF rendering: in `ThreadedPostTree.tsx` (and wherever message content is displayed), detect if content is a Giphy URL and render it as an `<img autoPlay>` at fixed width (max ~240px) instead of plain text. Respect left/right bubble alignment.
- Chat background: apply the splash page background image URL as `backgroundImage` on the `CardContent` chat container div, with a dark overlay (rgba 0,0,0,0.78) on top using a pseudo-element or an absolutely positioned div, so chat content remains fully readable.

### Modify
- `ChatPanel.tsx`: add GIF button + GifPicker toggle state; wire GIF send; update chat container background.
- `ThreadedPostTree.tsx`: detect Giphy URLs in message content and render inline GIF image.

### Remove
- Nothing removed.

## Implementation Plan
1. Create `src/frontend/src/components/chat/GifPicker.tsx` — Giphy API key `qohVIe02dMlAlSTnVtSwYOwF0DQ9qZDN`, trending endpoint, search endpoint, grid display, dark styling, mobile responsive, closes on GIF tap or outside click.
2. Update `ChatPanel.tsx`: import GifPicker, add `showGifPicker` state, add GIF button in compose row, handle GIF selection (send as message), update chat background to use splash image with dark overlay.
3. Update `ThreadedPostTree.tsx` (or the message rendering component): add `isGiphyUrl()` helper and render GIF inline when detected.
4. Validate and fix any TypeScript errors.
