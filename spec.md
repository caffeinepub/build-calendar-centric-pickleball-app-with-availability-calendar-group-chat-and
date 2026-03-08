# Somers Scheduler

## Current State

The backend has a single `userStats` map (`Map<Principal, UserStats.T>`) holding current season stats: wins, losses, totalGames, streak, bestStreak. When `finalizeCurrentSeason` is called, it resets wins/losses/totalGames to 0 for all users, effectively wiping their All Time stats from the backend.

To work around this, the frontend uses a localStorage cache (`all_time_leaderboard_cache`) that merges leaderboard data using a max strategy so numbers never go down. This is unreliable — it is device-specific and can be cleared by the browser.

The All Time tab on the leaderboard reads from this localStorage cache, not from the backend.

## Requested Changes (Diff)

### Add
- New `AllTimeStats` type in the backend with fields: `wins: Nat`, `losses: Nat`, `totalGames: Nat`, `bestStreakEver: Int`
- New `allTimeStats` map (`Map<Principal, AllTimeStats>`) in the backend, completely separate from `userStats`
- `ensureAllTimeStatsInitialized(user)` helper function
- `getAllTimeLeaderboard()` query function — returns `[(Principal, AllTimeStats)]` sorted by all-time score
- `getAllTimeStats(user)` query function — returns `?AllTimeStats` for a given user
- All-time stats update logic in `updateDailyLog` and `decrementDailyLog`: after updating `dailyLogs`, recompute raw cumulative totals (wins, losses, totalGames) from `dailyLogs` across ALL seasons and store in `allTimeStats`; also track `bestStreakEver` as the max of the current `calculateBestStreak` result and the stored `bestStreakEver`
- New `useGetAllTimeLeaderboard` query hook on the frontend

### Modify
- `finalizeCurrentSeason` — must NOT touch `allTimeStats` in any way; only resets `userStats`
- `deleteUser` — also remove the user's entry from `allTimeStats`
- `updateOverallStats` — after updating `userStats`, also call the all-time stats update logic
- `decrementDailyLog` — after updating `dailyLogs`, also update `allTimeStats` (decrement wins/losses/totalGames cumulatively, recalculate `bestStreakEver`)
- `LeaderboardPage` (frontend) — replace the localStorage all-time cache with a real backend query using `useGetAllTimeLeaderboard`; remove all localStorage read/write code for `ALL_TIME_CACHE_KEY`; update the All Time tab to display `bestStreakEver` in the Streak column instead of the seasonal `streak`
- `AllTimeCacheEntry`, `readAllTimeCache`, `cacheToLeaderboard`, `writeAllTimeCache` helpers — remove entirely from frontend

### Remove
- `ALL_TIME_CACHE_KEY` constant and all localStorage logic for all-time caching in `LeaderboardPage.tsx`
- The `useEffect` that merges fresh leaderboard data into localStorage

## Implementation Plan

1. **Backend — add `AllTimeStats` type and `allTimeStats` map**
   - Define `AllTimeStats` with `wins`, `losses`, `totalGames`, `bestStreakEver`
   - Add `allTimeStats` map
   - Add `ensureAllTimeStatsInitialized` helper

2. **Backend — update `updateOverallStats`**
   - After computing totals from `dailyLogs` for current user, also update `allTimeStats`:
     - wins/losses/totalGames = sum of ALL dailyLogs for that user (same as current season since dailyLogs are not reset, but will be cumulative across seasons because dailyLogs are never wiped)
     - `bestStreakEver` = max of `calculateBestStreak(user)` and existing `allTimeStats.bestStreakEver`

3. **Backend — update `decrementDailyLog`**
   - After decrementing `dailyLogs`, call `updateOverallStats` which will cascade to update `allTimeStats`

4. **Backend — add `getAllTimeLeaderboard` and `getAllTimeStats` query functions**

5. **Backend — update `finalizeCurrentSeason`**
   - Confirm it only resets `userStats`, never `allTimeStats` (already the case structurally, just needs to be explicit)

6. **Backend — update `deleteUser`**
   - Also call `allTimeStats.remove(userToDelete)`

7. **Frontend — add `useGetAllTimeLeaderboard` hook**

8. **Frontend — update `LeaderboardPage`**
   - Remove all localStorage cache helpers and effects
   - Replace `allTimeLeaderboard` state with data from `useGetAllTimeLeaderboard`
   - In the All Time tab's `LeaderboardTable`, pass `bestStreakEver` as the streak value for each row
