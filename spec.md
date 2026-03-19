# Somers Scheduler

## Current State
Fullly-featured pickleball scheduling app with calendar, chat, leaderboard, profile, badges, and admin dashboard. Backend stores individual match records with timestamps for streak calculation.

## Requested Changes (Diff)

### Add
- Backend functions: `resetUserCurrentStreak`, `resetUserBestStreak`, `getCallerAllTimeColdStreak`, `getUserAllTimeColdStreak`
- Admin Streak Management section in Admin tab with user selector and confirmation dialogs
- All Time Cold Streak stat on Profile page (longest consecutive losing streak)
- ❄️ display for losing streaks on Leaderboard (Current Season) and Profile

### Modify
- `calculateStreak` backend function: now returns negative values for losing streaks (e.g. -3 = 3-game losing streak)
- `calculateBestStreak` backend function: respects `bestStreakResetAt` cutoff timestamp
- Win/Loss bar chart: filter out dates with 0 wins and 0 losses
- Leaderboard streak column: show ❄️ for negative streak values
- Profile streak section: 3-column grid, cold streak stat, ❄️ for active losing streak

### Remove
- Nothing removed

## Implementation Plan
1. Backend: Add `currentStreakResetAt` and `bestStreakResetAt` maps; update streak functions; add reset and cold streak query functions
2. Frontend hooks: Add `useResetUserCurrentStreak`, `useResetUserBestStreak`, `useGetCallerAllTimeColdStreak`, `useGetUserAllTimeColdStreak`
3. ProfileWinLossChart: filter 0/0 entries from chart data
4. LeaderboardPage: update streak column rendering for negative values
5. ProfilePage: add cold streak stat, update current streak display
6. AdminPage: add Streak Management card with confirmation dialogs
