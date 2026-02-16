# Specification

## Summary
**Goal:** Fix the Leaderboard date selector regression so users can select any day they’ve added availability for (including future dates) when recording results.

**Planned changes:**
- Backend: update/fix the query powering the Leaderboard “Select a date to record results” dropdown to return all availability days for the caller (including future dates) with no artificial cap (e.g., not limited to 5).
- Frontend: update the Leaderboard page to use the corrected “caller available days” data source so the dropdown populates whenever the user has saved availability on the Calendar page.
- Backend: correct sorting/comparator logic in `getCallerAvailableDaysWithLogs` to avoid comparator bugs and ensure deterministic ordering (even if it remains used for match history).

**User-visible outcome:** On the Leaderboard tab, users who have added availability will see selectable dates (including future ones) in the date dropdown; the warning about needing availability only appears when none exists, and selecting a date enables win/loss recording for that day.
