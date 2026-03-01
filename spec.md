# Specification

## Summary
**Goal:** Convert the win/loss chart from a line chart to a bar chart and fix the best streak calculation on the profile page.

**Planned changes:**
- Replace the `LineChart`/`Line` components in `ProfileWinLossChart.tsx` with `BarChart`/`Bar` components, preserving all time range filters, axis labels, tooltips, and win/loss color conventions
- Fix the best streak calculation in the profile section to track the longest consecutive winning streak instead of a cumulative total

**User-visible outcome:** The win/loss chart displays as a bar chart, and the best streak value on the profile page correctly shows the longest unbroken winning streak.
