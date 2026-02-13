# Specification

## Summary
**Goal:** Add “Remove Win” and “Remove Loss” actions on the Leaderboard so users can decrement daily win/loss counts with persistence and updated stats.

**Planned changes:**
- Update the Leaderboard tab action row (date-selection area) to show four buttons: Win, Loss, Remove Win, Remove Loss, with the remove buttons immediately next to the existing add buttons.
- Implement frontend remove-win/remove-loss behavior: require a selected date, prevent decrements below 0, disable action buttons while mutations are pending, and show success/error toasts consistent with existing add flows.
- Add React Query mutations/hooks for removing a daily win and removing a daily loss, calling new backend actor methods and invalidating the same query keys as existing add mutations (callerStats, leaderboard, callerMatchHistory).
- Extend the Motoko backend actor to support decrementing a caller’s daily wins/losses for a given day with the same authorization guard as existing record methods, preventing underflow, and recomputing overall stats so leaderboard totals update.

**User-visible outcome:** On the Leaderboard tab, users can select a date and both add or remove wins/losses for that day; counts never go negative, and the leaderboard/match history update to reflect decrements.
