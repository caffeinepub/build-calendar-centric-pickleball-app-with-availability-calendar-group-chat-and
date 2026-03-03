# Somers Scheduler

## Current State
- Primary color is OKLCH hue 145 (teal/blue-green), which appears washed out or white on some backgrounds
- Chat emoji reactions (👍 👎 😂 ❤️ 🔥 😮) are always visible as a row of buttons under every message
- ImageAttachmentPicker (paperclip) renders above the message input row as a separate component
- Leaderboard PlayerProfileModal shows earned badges as small Badge chips with just the badge name and a star icon — no description text

## Requested Changes (Diff)

### Add
- Badge description text under each earned badge in the PlayerProfileModal (leaderboard user stats modal)
- Long-press interaction on messages to reveal emoji picker in ReactionControls

### Modify
- `src/frontend/src/index.css`: Update `--primary` and `--ring` tokens in both `:root` and `.dark` to neon yellow-green (OKLCH ~0.85 chroma 0.22 hue 120 in light, ~0.82 chroma 0.25 hue 118 in dark). Update `--primary-foreground` to a dark color (near black) so text on neon-green buttons is readable. Also update `--chart-1`, `--sidebar-primary`, `--sidebar-ring` to match.
- `ReactionControls.tsx`: Hide all emoji buttons by default. Show a small smiley/reaction trigger icon. On long-press (or long-touch on mobile), reveal the emoji picker row. After a user selects an emoji, hide the picker and show only that selected emoji (with its count if applicable). If no reaction is selected, show no emoji — just the trigger icon.
- `ChatPanel.tsx` + `ImageAttachmentPicker.tsx`: Move the paperclip icon button out of the separate component area above the input and into the same flex row as the text input and send button, positioned to the left of the send button (right of the text input).
- `PlayerProfileModal.tsx`: In the earned badges section, change from a flat Badge chip list to a vertical list where each item shows the badge name + a small description text below it (sourced from `badge.description`).

### Remove
- Nothing removed

## Implementation Plan
1. Update `index.css` — change `--primary` to OKLCH neon yellow-green, update foreground to dark/black, update ring and chart tokens to match in both light and dark modes.
2. Update `ReactionControls.tsx` — implement long-press detection (using onMouseDown/onTouchStart timers), hide emoji row by default, show emoji picker on long-press, collapse back to showing only the selected emoji after selection.
3. Update `ChatPanel.tsx` and `ImageAttachmentPicker.tsx` — restructure the form so the paperclip trigger button sits inline in the message row (left of the send button), while the image preview still shows above the row when an image is selected.
4. Update `PlayerProfileModal.tsx` — replace the flat badge chip list with a styled list showing badge name and description text beneath each badge.
