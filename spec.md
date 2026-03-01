# Specification

## Summary
**Goal:** Fix the `ProfileWinLossChart` component so the x-axis displays dates derived from actual match history data, anchored to today's date based on the selected time range filter.

**Planned changes:**
- Update `ProfileWinLossChart` to derive x-axis dates from real match history records instead of generating or hardcoding them.
- Anchor the x-axis range to the current date for each filter: last 7 days (week), last 30 days (month), last 12 months (year).
- For the "all-time" filter, bound the x-axis by the earliest and latest actual match records.
- Show an appropriate empty state when no match records exist for the selected range instead of displaying fabricated dates.

**User-visible outcome:** The win/loss line chart x-axis will only show dates relevant to actual match data within the selected time range, and will never display stale or incorrect months (e.g., August when the current month is February).
