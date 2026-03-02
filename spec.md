# Specification

## Summary
**Goal:** Enhance the Profile and Leaderboard tabs with badge progress visibility, clickable player modals, a Games Played column, and paginated match history.

**Planned changes:**
- Profile tab: Display all badge definitions (earned and unearned); unearned badges show dimmed with a progress bar and count label (e.g., "3/10 wins") based on the user's stats
- Leaderboard tab: Make each player row clickable to open a modal showing that player's wins/losses bar chart over time, current and best win streaks, and their earned badges
- Leaderboard tab: Add a "Games Played" column (wins + losses) alongside existing columns
- Profile tab: Replace the 5-entry match history limit with a paginated list (e.g., 10 per page) with next/previous controls and a loading state

**User-visible outcome:** Users can track their progress toward all badges in their profile, page through their full match history, and click any player on the leaderboard to view that player's stats and badges in a modal overlay.
