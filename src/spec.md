# Specification

## Summary
**Goal:** Simplify the Profile tab by removing the “Additional Information” section and adding a functional Match History showing recent wins/losses by date.

**Planned changes:**
- Remove the “Additional Information” card/section from the Profile page and keep “Leaderboard Rankings” as its own section.
- Add a “Match History” section to the Profile page that displays a single combined list of the caller’s last 5 availabilities played, ordered by most recent date first, showing Wins and Losses for each date.
- Add backend query API(s) to fetch caller-scoped available day IDs and per-day win/loss totals (DailyLog), enforcing user-only authorization consistent with existing endpoints.
- Update React Query hooks and consuming pages to use the new caller-scoped backend queries (replacing any admin-only availability fetching) and wire them into Profile > Match History and the Leaderboard date selector.

**User-visible outcome:** On the Profile tab, users no longer see “Additional Information” and instead see “Leaderboard Rankings” plus a working “Match History” list of up to 5 recent dates with explicit Wins/Losses counts (with an English empty state when no availabilities exist).
