# Somers Scheduler

## Current State
- `src/frontend/index.css` uses a default shadcn neutral/grayscale theme (--primary: 0.205 0 0 / 0.922 0 0), causing buttons, tabs, and calendar highlights to appear white/gray instead of green.
- `src/frontend/src/index.css` has the correct green theme (--primary: 0.85 0.22 120 / 0.82 0.25 118) but the build picks up the root-level file first.
- Chat `ReactionControls.tsx`: Emojis are hidden behind a long-press gesture; only the selected emoji is shown on a message; no persistent reaction counts displayed below messages for all users.
- Chat `ChatPanel.tsx`: Input row order is `[text input] [paperclip] [send]`.
- Chat `ReplyComposer.tsx`: `ImageAttachmentPicker` rendered above the input row; no inline paperclip next to send button.
- Leaderboard `LeaderboardPage.tsx`: No rank change indicator next to player positions in the Rankings table.

## Requested Changes (Diff)

### Add
- Rank change indicator column in leaderboard Rankings table: green up arrow (▲) for improvement, red down arrow (▼) for drop, dash (—) for no change. Store previous rank snapshot in localStorage keyed by principal, compare on each leaderboard load.
- Persistent emoji reaction display: below every chat message/reply, show a row of reacted emojis with their counts, visible to all users at all times (no interaction required to see them).

### Modify
- `src/frontend/index.css`: overwrite entirely with the correct green OKLCH theme matching `src/frontend/src/index.css` (already done via direct file write).
- `ChatPanel.tsx` input row: reorder to `[text input] [paperclip] [send]` → `[text input] [paperclip] [send]`. Currently paperclip is between input and send — move paperclip to be immediately left of the send button (order is already correct in ChatPanel; confirm paperclip stays left of send).
- `ReplyComposer.tsx`: move `ImageAttachmentPicker` out of the top area and place a paperclip icon button inline in the input row, to the left of the send button (matching ChatPanel layout).
- `ReactionControls.tsx`: Remove long-press requirement. Always show all reactions with counts > 0 below the message as small pill badges. Add a small "+" or smiley trigger button to open the emoji picker inline (tap, not long-press). When user has reacted, highlight their selected emoji pill.

### Remove
- Long-press gesture for triggering emoji picker in `ReactionControls.tsx`.

## Implementation Plan
1. `src/frontend/index.css` — already fixed (correct green theme written).
2. `ReactionControls.tsx` — Refactor: always render reaction pills (emoji + count) below message when count > 0. Add a small smiley/+ button to open picker on tap. Remove long-press logic entirely. Highlight the user's own selected emoji.
3. `ReplyComposer.tsx` — Move `ImageAttachmentPicker` logic inline: add hidden file input + paperclip icon button inside the input row, left of the send button. Remove the separate `ImageAttachmentPicker` block above.
4. `LeaderboardPage.tsx` — Add rank change tracking: on leaderboard load, read previous ranks from localStorage, compare to current ranks, compute delta per principal, write new snapshot to localStorage. Add a new column in the Rankings table showing ▲ (green), ▼ (red), or — for each player.
