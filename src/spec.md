# Specification

## Summary
**Goal:** Update the all-time Leaderboard table to remove the Score column and restore Win % and Streak using all-time stats.

**Planned changes:**
- Remove the “Score” column from the All-Time Rankings leaderboard table (header and row values) and eliminate any user-facing “Score” references on the Leaderboard page.
- Add back a “Win %” column in the all-time leaderboard, computed as wins / totalGames from the existing all-time stats (show 0% when totalGames is 0).
- Add back a “Streak” column in the all-time leaderboard, sourced from the existing all-time streak value (show 0 when no games exist).
- Ensure the backend leaderboard API continues returning all-time wins, losses, totalGames, and streak, and that these fields update after recording/removing wins/losses without adding weekly/monthly logic.

**User-visible outcome:** The Leaderboard (All-Time Rankings) no longer shows “Score” and instead shows per-player Win % and Streak based on all-time results, updating correctly as games are added or removed.
