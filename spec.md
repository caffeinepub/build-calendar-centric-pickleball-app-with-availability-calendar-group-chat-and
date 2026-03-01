# Specification

## Summary
**Goal:** Fix win streak calculations on the Profile and Leaderboard pages so they use consecutive win/loss match records instead of days played or availability data.

**Planned changes:**
- Fix the current streak calculation on the ProfilePage to count consecutive wins by iterating backwards through match history and stopping at the first loss
- Fix the best (all-time) streak calculation (`computeBestStreak`) on the ProfilePage to scan full match history chronologically, increment on wins, reset on losses, and return the highest value reached
- Fix the win streak calculation on the LeaderboardPage to use the same corrected consecutive-win logic

**User-visible outcome:** The Profile tab and Leaderboard now display accurate win streaks based on actual match results — current streak reflects unbroken wins from the most recent match backwards, and best streak reflects the longest winning run across all history.
