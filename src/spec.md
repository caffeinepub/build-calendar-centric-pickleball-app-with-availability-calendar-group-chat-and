# Specification

## Summary
**Goal:** Fix backend leaderboard weekly/monthly timeframe filtering so it correctly limits results to the intended day windows using integer day ID comparisons.

**Planned changes:**
- Update backend leaderboard aggregation to filter daily logs for Weekly (last 7 days, inclusive) and Monthly (last 30 days, inclusive) by comparing stored integer day IDs against the current day ID, instead of comparing nanosecond timestamps.
- Ensure all backend leaderboard endpoints that accept a timeframe apply the same filtering logic so they return consistent results for weekly/monthly/all.
- Preserve existing record/remove result behavior (recordDailyWin/recordDailyLoss/decrementDailyLog) without data migration, and ensure existing stored daily logs continue to work with the corrected filtering immediately.

**User-visible outcome:** Weekly and Monthly leaderboard views show only results from the last 7 or 30 days respectively (inclusive), All Time remains unchanged, and wins/losses/totalGames/streak/score and ordering reflect only the selected timeframe across all leaderboard endpoints.
