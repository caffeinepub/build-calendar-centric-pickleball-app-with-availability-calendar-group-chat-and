# Somers Scheduler

## Current State

The app has a seasonal leaderboard with three tabs: Current Season, All Time, and Past Seasons. Both "Current Season" and "All Time" tabs read from the same backend `userStats` map. When an admin finalizes a season via `finalizeCurrentSeason`, it resets all values in `userStats` to zero — which also zeroes out the All Time leaderboard because they share the same data source.

## Requested Changes (Diff)

### Add
- A new permanent `allTimeStats` map in the backend that accumulates wins/losses/streaks forever and is never reset.
- A new `getAllTimeLeaderboard()` query that reads from `allTimeStats` instead of `userStats`.

### Modify
- `updateOverallStats()` must update both `userStats` (current season) and `allTimeStats` (permanent) every time a win or loss is recorded. All-time stats use the same recalculation logic (sum all dailyLogs).
- `finalizeCurrentSeason()` must only reset `userStats` (current season wins/losses/totalGames), leaving `allTimeStats` completely untouched.
- `getLeaderboard()` (used by the All Time tab in the frontend) should be backed by `allTimeStats` so it is never affected by season resets.
- `ensureUserStatsInitialized()` should also initialize `allTimeStats` for new users.
- Frontend `useGetLeaderboard` hook already calls `getLeaderboard()` — no change needed there; the fix is purely in what data `getLeaderboard()` returns.

### Remove
- Nothing removed.

## Implementation Plan

1. Add `allTimeStats` map (same type as `userStats`) to the backend actor state.
2. Update `ensureUserStatsInitialized` to also seed `allTimeStats` for new users.
3. Update `updateOverallStats` to recompute totals from `dailyLogs` and write to BOTH `userStats` and `allTimeStats`.
4. Add `getAllTimeLeaderboard()` query that sorts and returns `allTimeStats`.
5. Change `getLeaderboard()` to return `allTimeStats` sorted by score (so the All Time tab is always correct).
6. In `finalizeCurrentSeason`, only iterate over `userStats` for the reset — do not touch `allTimeStats`.
7. No frontend changes needed; the existing `useGetLeaderboard` hook maps to `getLeaderboard()` which will now return all-time data correctly.
