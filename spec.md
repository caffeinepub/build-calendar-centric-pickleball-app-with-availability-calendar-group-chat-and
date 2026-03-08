# Somers Scheduler

## Current State

The app has:
- A full backend (Motoko) with userStats, allTimeStats, dailyLogs, availability, posts/chat, badges, seasonSnapshots
- TopBar with light/dark toggle and user avatar dropdown — no notification bell
- LeaderboardPage with rank change detection using a localStorage snapshot and a ref-based toast for the current user's own rank change (fires only when they themselves log a match)
- ChatPage / ChatPanel with toast on send; uses `InlineLoading` (spinner) for initial load
- ProfilePage with skeleton loaders already in StreakStats; other sections use data directly
- AddAvailabilityPage with toast on availability submit
- No backend notification storage — notifications are entirely ephemeral / localStorage-based

## Requested Changes (Diff)

### Add
- **Backend: Notification domain**
  - `Notification` type with fields: `id`, `recipient` (Principal), `category` (`#mention`, `#reply`, `#badgeUnlock`, `#rankChange`, `#availabilityOverlap`), `message` (Text), `timestamp` (Int), `read` (Bool), optional `relatedPostId` (for mentions/replies), optional `badgeId`, optional `rankInfo` (`{oldRank: Nat; newRank: Nat}`)
  - `notifications` map: `Map<(Principal, Int), Notification>` (keyed by recipient + notification id)
  - `notificationCounter` variable
  - Internal `createNotification(recipient, category, message, ...)` helper
  - `getMyNotifications() : async [Notification]` — returns caller's notifications sorted newest-first
  - `markNotificationRead(notifId: Int) : async ()` — marks one notification read
  - `markAllNotificationsRead() : async ()` — marks all caller notifications read
  - `getUnreadNotificationCount() : async Nat` — returns count of unread notifications for caller

- **Backend: Notification triggers**
  - In `addPost`: when `parentId` is provided, create a `#reply` notification for the parent post's author (if different from caller). Also scan content for `@mentions` and create `#mention` notifications.
  - In `addAvailability`: scan for other users already marked available on the same day and create `#availabilityOverlap` notifications for the caller (notifying them of the overlap).
  - In `evaluateAndAwardBadges`: when a badge is newly awarded, create a `#badgeUnlock` notification for the user.
  - In `updateOverallStats` / anywhere that recalculates leaderboard: after updating stats, compute each user's new rank and compare to their previous rank; if rank position changed, create a `#rankChange` notification for affected users.

- **Frontend: Bell icon in TopBar**
  - Add a Bell icon button between the theme toggle and the avatar dropdown in TopBar
  - Show a red badge count bubble on the bell when unreadCount > 0 (capped at 99+)
  - Clicking the bell opens a Popover/Sheet with the notification list
  - Notification panel: shows all notifications in reverse-chronological order, grouped by category icon, with "Mark all as read" button
  - Each notification item shows: icon (by category), message, relative time, and read/unread visual state
  - Empty state: "You're all caught up" message
  - Poll `getUnreadNotificationCount` every 30 seconds; poll `getMyNotifications` when panel is opened

- **Frontend: Toast notifications**
  - Availability submit: already exists in AddAvailabilityPage — confirm it's working
  - Chat send: already exists in ChatPanel — confirm working
  - Badge earned: trigger toast from ProfileBadges or BadgeUnlockAnimation when a new badge is detected
  - Rank change (own): fires when user's own rank position improves OR drops — sourced from backend `#rankChange` notification, not just on own log action; also fires when someone else's match log bumps their rank. Polling backend notifications every 30s will catch passive rank changes.

- **Frontend: Skeleton loaders**
  - LeaderboardTable: replace `InlineLoading` spinner with a table-shaped skeleton (6 rows of rank/player/stats cells)
  - ChatPanel initial load: replace `InlineLoading` with skeleton rows shaped like chat messages (avatar circle + lines)
  - ProfileLeaderboardRanks: add skeleton while loading
  - ProfileCard: add skeleton while profile data loads
  - ProfileMatchHistory: add skeleton while loading

### Modify
- `TopBar.tsx`: add Bell button with unread badge between theme toggle and avatar menu
- `LeaderboardTable`: replace `InlineLoading` with skeleton rows
- `ChatPanel`: replace initial load `InlineLoading` with chat-shaped skeletons
- `ProfileLeaderboardRanks`, `ProfileCard`, `ProfileMatchHistory`: add skeleton loading states
- `useQueries.ts`: add `useGetMyNotifications`, `useGetUnreadNotificationCount`, `useMarkNotificationRead`, `useMarkAllNotificationsRead` hooks
- Rank change toast: expand existing logic to also detect passive rank changes from backend notifications (fire when a `#rankChange` notification is received that wasn't there before)

### Remove
- The localStorage-based `RANK_SNAPSHOT_KEY` snapshot approach in LeaderboardPage can be kept for rank arrows (visual indicator) but rank-change toasts should be driven by backend notifications rather than local ref comparison

## Implementation Plan

1. **Backend**: Add `Notification` type, `notifications` map, `notificationCounter`, CRUD functions (`getMyNotifications`, `markNotificationRead`, `markAllNotificationsRead`, `getUnreadNotificationCount`). Wire notification creation into `addPost` (reply/mention), `addAvailability` (overlap), `evaluateAndAwardBadges` (badge unlock), and `updateOverallStats` (rank change by recomputing ranks for all users and diffing).

2. **Frontend hooks**: Add notification query/mutation hooks in `useQueries.ts` typed against the new backend API.

3. **TopBar bell**: Add Bell icon with popover notification panel, unread count badge, polling, mark-as-read actions, and category icons.

4. **Skeleton loaders**: 
   - `LeaderboardTable`: 6-row skeleton with rank badge, avatar, and stats columns
   - `ChatPanel`: 5 chat-bubble-shaped skeleton rows (alternating left-aligned)
   - `ProfileLeaderboardRanks`, `ProfileCard`, `ProfileMatchHistory`: inline skeletons matching content shape

5. **Rank change toast via notifications**: Poll `getUnreadNotificationCount` every 30s; when new `#rankChange` notifications appear, fire a toast describing the change. After showing, mark them read.
