# Specification

## Summary
**Goal:** Extend the admin badge creation form with 12 new criteria types and reverse the date sort order in the leaderboard win/loss dropdown.

**Planned changes:**
- Add 12 new criteria types to the badge creation/edit modal dropdown in the Admin tab: `totalDaysAvailable`, `totalGamesPlayed`, `firstMatchLogged`, `winPercentage`, `bestWinStreak`, `totalChatMessages`, `totalLikesReceived`, `firstImageUploaded`, `topLeaderboardPosition`, `daysAtNumber1`, `monthlyParticipation`, `consecutiveWeeksAvailable`
- Each new criteria type shows an appropriate numeric threshold input when selected
- Extend the backend `BadgeCriteria` type to include all new criteria variants
- Keep existing criteria types (`totalWins`, `winsStreak`, `totalGames`) unchanged
- Reverse the date dropdown sort order in the Leaderboard tab (newest dates at top, oldest at bottom)

**User-visible outcome:** Admins can create badges using 12 additional criteria types in the badge management form. Leaderboard users see dates listed newest-first when selecting a date to log wins or losses.
