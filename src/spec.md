# Specification

## Summary
**Goal:** Add global in-app toast notifications for availability creation/updates and for when a user’s leaderboard rank improves.

**Planned changes:**
- Mount a single global Sonner `Toaster` at the app root/layout so existing `toast.*` calls render on all routes.
- In `frontend/src/pages/AddAvailabilityPage.tsx`, show a success toast on successful availability add/update (before navigating away) and an error toast on submit failure, ensuring it fires once per submit.
- In `frontend/src/pages/LeaderboardPage.tsx`, track the current user’s rank across leaderboard refreshes and show a toast only when their rank improves (not on initial load, and not when unchanged/worse).

**User-visible outcome:** Users see immediate in-app toast confirmations when they add/update availability, and they get a toast on the Leaderboard page when they move up in rank during the session.
