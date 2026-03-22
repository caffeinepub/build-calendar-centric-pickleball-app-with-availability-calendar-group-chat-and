# Somers Scheduler

## Current State
- Leaderboard has a rank change indicator derived from backend notifications (newRank/oldRank fields). Bug: when rank number increases (worse), a green up arrow shows instead of red down. Toast may also show wrong rank number.
- DayDetailPage shows daily weather (high/low, condition, wind, precip) but no 3-hour interval breakdown.
- ChatPanel has basic polling every 5s but re-fetches full page. No gradient header/bg, no slide-in animations for new messages.

## Requested Changes (Diff)

### Add
- 3-hour interval forecast row (horizontal scrollable) in DayDetailPage — show time, temp, icon, condition label for each slot of the tapped day
- Slide-in/fade-in animation for newly arrived chat messages
- Subtle glowing border on new/unread messages that fades out
- Gradient chat header (deep blue to purple)
- Subtle gradient background on chat container (dark navy to near-black)
- Incremental polling: track last-received message timestamp and only fetch messages newer than that
- Stop polling when chat tab is not active (document visibility API)

### Modify
- Rank arrow logic: fix so that newRank < oldRank (closer to #1) = green up arrow, newRank > oldRank (further from #1) = red down arrow. Use snapshot-based comparison (store prev leaderboard in a ref) instead of relying on notification fields to avoid data ordering issues.
- Rank toast: derive the toast rank number from the player's actual 1-based position in the current leaderboard array, not from notification metadata.
- weatherService.ts: export raw 3-hour slot data per date (not just daily aggregates) so DayDetailPage can render them.

### Remove
- Nothing removed

## Implementation Plan
1. Fix LeaderboardPage rank indicator: use a `prevLeaderboardRef` to store previous sort order; compare positions to determine up/down; green up = improved (lower number), red down = worsened (higher number). Fix toast to use player's actual index+1 in current sorted leaderboard.
2. Update weatherService to expose `fetchHourlyForecastByDate(dateStr)` returning raw 3-hour slots for that date.
3. Update DayDetailPage to call `fetchHourlyForecastByDate` and render a horizontal scrollable strip of 3-hour slots below the existing daily weather card.
4. Update ChatPanel: add gradient header/bg via Tailwind/inline styles, add CSS keyframe animation for new messages, add glow effect on unread/new, implement incremental polling with lastMessageId ref, pause polling on visibility change.
