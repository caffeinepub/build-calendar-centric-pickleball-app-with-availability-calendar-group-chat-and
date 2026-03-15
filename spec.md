# Somers Scheduler

## Current State
Wins and losses are stored as daily aggregate counts: `DailyLog = { wins: Nat; losses: Nat }` keyed by `(Principal, dayInt)`. There are no individual timestamped records per result. Streak logic operates at the day level: if a day has both wins and losses, the streak resets — making it impossible to count wins that occurred after a loss on the same day, or to correctly order results across games.

## Requested Changes (Diff)

### Add
- `IndividualMatchResult` type: `{ id: Int; player: Principal; result: { #win; #loss }; timestamp: Int }`
- `individualResults` stable map keyed by `(Principal, Int)` (where Int is the nanosecond timestamp at record time)
- `getIndividualResults(player)` query that returns all individual records for a player sorted newest-to-oldest
- New streak functions that operate on individual records sorted by timestamp

### Modify
- `recordDailyWin` and `recordDailyLoss` — also insert an `IndividualMatchResult` record with `Time.now()` timestamp
- `decrementDailyLog` — remove the most recent matching individual result record when a win or loss is undone
- `calculateStreak` — rewrite to: sort individual records newest-to-oldest, walk from most recent, count consecutive wins stopping at first loss
- `calculateBestStreak` — rewrite to: sort individual records oldest-to-newest, walk all records, track running streak resetting on loss, track max
- `updateOverallStats` — call the new streak functions after each result change
- Frontend `badgeProgress.ts` and any leaderboard/profile streak calculations — use individual records for streak math

### Remove
- Old day-level streak logic that uses `log.wins > 0 and log.losses == 0` per day

## Implementation Plan
1. Add `IndividualMatchResult` type and `individualResults` map to backend
2. Update `recordDailyWin`/`recordDailyLoss` to insert individual result records
3. Update `decrementDailyLog` to remove the most recent matching record
4. Add `getIndividualResults` query
5. Rewrite `calculateStreak` and `calculateBestStreak` using individual records
6. Regenerate `backend.d.ts` bindings
7. Update frontend streak calculations in leaderboard, profile, and player modal to use individual records
