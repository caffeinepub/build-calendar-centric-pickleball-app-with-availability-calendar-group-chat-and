# Somers Scheduler

## Current State

Somers Scheduler is a pickleball social scheduling app with a calendar, leaderboard (Current Season / All Time / Past Seasons tabs), profile page, chat, and admin panel.

The backend (`main.mo`) has `getCurrentSeasonLeaderboard`, `finalizeCurrentSeason`, `getPastSeasonSnapshots`, `awardBadgeToUserInternal`, and `badgeDefinitions` already implemented.

The frontend has:
- `LeaderboardPage.tsx` — season tabs, Finalize Season button lives in Current Season tab (admin-only)
- `AdminPage.tsx` — user/availability management, BadgeManagement, AdminBadgeAwardPanel
- `useQueries.ts` — `useRecordDailyWin`/`useRecordDailyLoss` invalidate `["leaderboard"]` but NOT `["currentSeasonLeaderboard"]`
- `useBadgeUnlockWatcher.ts` — watches user badges and queues animation for newly earned badges
- Badge trophy icon at `/assets/generated/season-champion-trophy-transparent.dim_256x256.png`

## Requested Changes (Diff)

### Add
- `finalizeCurrentSeason` confirmation AlertDialog in AdminPage with dynamic year text ("Are you sure? This will lock the {year} season and reset all scores. This cannot be undone.")
- Finalize Season section card in AdminPage (admin only), removing it from LeaderboardPage
- Season Champion badge auto-creation: backend `finalizeCurrentSeason` must ensure badge `season-champion` exists before awarding (create it if missing, with name "Season Champion", description, Legendary tier indicator in name). Frontend must also seed the badge via admin action if not yet created.
- Frontend: after successful season finalization, show badge unlock animation for the 1st place player if they are the current user
- Season Champion badge visible and editable in AdminPage > BadgeManagement — no special handling needed since it will be a normal badge definition with id `season-champion`

### Modify
- `useRecordDailyWin` and `useRecordDailyLoss` in `useQueries.ts`: add `queryClient.invalidateQueries({ queryKey: ["currentSeasonLeaderboard"] })` to `onSuccess` to fix real-time refresh
- `useRemoveDailyWin` and `useRemoveDailyLoss`: same fix
- `LeaderboardPage.tsx`: remove Finalize Season button from Current Season tab header
- `AdminPage.tsx`: add new "Finalize Season" card with confirmation dialog, year display, and badge unlock trigger for current user if they are 1st place
- `finalizeCurrentSeason` in `main.mo`: before calling `awardBadgeToUserInternal`, check if `season-champion` badge exists and create it if not
- Season finalization logs timestamp via existing snapshot mechanism

### Remove
- Finalize Season button from `LeaderboardPage.tsx` Current Season tab

## Implementation Plan

1. Update `main.mo` `finalizeCurrentSeason` to auto-create `season-champion` badge if missing, include description and mark as Legendary in the name
2. Fix `useQueries.ts`: add `currentSeasonLeaderboard` invalidation to win/loss record and remove mutations
3. Remove Finalize Season button from `LeaderboardPage.tsx`
4. Add Finalize Season card to `AdminPage.tsx` with:
   - AlertDialog confirmation with dynamic year
   - On confirm: call `finalizeCurrentSeason`, invalidate queries, trigger badge unlock animation if current user is 1st place
5. Ensure Season Champion badge (`season-champion`) is seeded in BadgeManagement with the trophy icon and is fully editable
