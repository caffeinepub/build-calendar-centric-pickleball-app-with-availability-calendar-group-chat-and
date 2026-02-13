# Specification

## Summary
**Goal:** Correct weekly/monthly leaderboard filtering so it uses the user-selected result date (not all-time totals) and returns accurate timeframe-specific rankings.

**Planned changes:**
- Update backend leaderboard queries so weekly includes only results from the last 7 days (inclusive of today) and monthly includes only results from the last 30 days (inclusive of today), based on the user-selected result date.
- Persist a discrete timestamp (or equivalent comparable representation) derived from the selected result date when recording wins/losses, and ensure decrement/remove operations remain correct with this stored representation.
- Add Motoko state migration only if needed to keep existing stored results readable and prevent traps after upgrade.
- Ensure frontend Weekly/Monthly/All Time filters display results that match the corrected backend timeframe logic without changing the existing date-selection and add/remove flow.

**User-visible outcome:** Switching between Weekly, Monthly, and All Time shows leaderboard rankings and totals that correctly reflect only the results recorded within that timeframe (or all-time), using the date the user selected when logging results.
