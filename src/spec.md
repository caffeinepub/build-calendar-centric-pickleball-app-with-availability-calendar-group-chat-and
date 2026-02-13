# Specification

## Summary
**Goal:** Improve the Leaderboard layout, fix Admin deletions, add an admin-only login timestamp log, and introduce in-app toast notifications for key activity.

**Planned changes:**
- Update the affected UI so Win and Loss labels/values render side-by-side (horizontal) instead of stacked vertically, preserving existing styling and spacing across mobile and desktop.
- Fix Admin tab delete actions for (a) users and (b) availability entries so deletions succeed immediately and the Admin UI updates without manual refresh (including refreshing availabilities after deleting a user).
- Record each user’s latest sign-in timestamp on login and display it in the Admin tab as a human-readable date/time, restricted to admins (backend-enforced).
- Add in-app toast notifications that trigger (a) when another user adds availability while the viewer is on Calendar/Day Detail views, and (b) when the current user’s leaderboard rank improves while viewing the Leaderboard tab, avoiding repeat/spam on unchanged polling.

**User-visible outcome:** Win/Loss is displayed in a cleaner horizontal row, Admin deletes work and update instantly, admins can see users’ latest sign-in times, and users receive toast notifications for new availability activity and positive rank changes.
