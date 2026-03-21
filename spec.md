# Somers Scheduler

## Current State
- Leaderboard uses notification data to derive rank changes; arrows may show wrong direction
- Calendar day detail shows weather summary only (no 3-hour interval breakdown)
- Chat is forum-style (newest at top, flat background, no typing indicator, no per-user colors)
- No typing indicator in backend or frontend

## Requested Changes (Diff)

### Add
- 3-hour interval forecast row in DayDetailPage expanded view (horizontal scrollable, up to 8 slots: time, icon, temp, label)
- Per-user deterministic accent colors based on username hash (used in chat, leaderboard, profile)
- Typing indicator: backend `updateTypingIndicator`/`getTypingUsers` functions + frontend animated dots
- Chat gradient header (deep blue → purple)
- Chat gradient background (dark navy → near-black)
- Chat message bubbles: own messages right-aligned in accent color, others left in dark card
- Fade-in/slide-up animation for new messages
- Emoji reaction bounce animation
- Group consecutive messages from same user (no repeated header)
- Auto-refresh polling every 3-5s, stop when tab inactive
- Incremental fetch (only messages newer than last known)

### Modify
- Rank change arrows: derive from comparing previous leaderboard snapshot ref to current (no backend needed). Green up = rank number decreased (improved). Red down = rank number increased (worsened).
- Toast notifications show correct current rank number
- Chat layout flipped: newest messages at BOTTOM (iMessage/WhatsApp convention)
- "Jump to Latest" scrolls to BOTTOM, uses ArrowDown icon
- Load-older trigger at TOP of scroll container
- weatherService.ts: add `fetchHourlyForecastForDay(dateStr)` returning array of 3-hour slots

### Remove
- Previous rank-change arrow logic based on notification data only

## Implementation Plan
1. Add `updateTypingIndicator(userId, timestamp)` and `getTypingUsers()` to backend main.mo
2. Add `fetchHourlyForecastForDay(dateStr)` to weatherService.ts using existing forecast API
3. Update DayDetailPage to show 3-hour slots as horizontal scrollable row
4. Refactor LeaderboardPage rank change logic to compare prev/current leaderboard snapshots
5. Refactor ChatPanel: flip to bottom-newest, gradient, per-user colors, typing indicator, grouping, animations
6. Refactor ThreadedPostTree: bubble layout (own=right, other=left), accent colors, grouping
