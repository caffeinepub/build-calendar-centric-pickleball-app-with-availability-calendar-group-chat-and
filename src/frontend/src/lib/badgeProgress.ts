import type { BadgeCriteria, BadgeDefinition, DayWithLog } from "../backend";

export interface BadgeProgress {
  current: number;
  required: number;
  percentage: number;
}

/**
 * Computes the best (all-time) win streak from match history.
 */
function computeBestWinStreak(matchHistory: DayWithLog[]): number {
  if (matchHistory.length === 0) return 0;
  const sorted = [...matchHistory].sort((a, b) =>
    a.day < b.day ? -1 : a.day > b.day ? 1 : 0,
  );
  let best = 0;
  let current = 0;
  for (const entry of sorted) {
    for (let i = 0; i < Number(entry.wins); i++) {
      current += 1;
      if (current > best) best = current;
    }
    for (let i = 0; i < Number(entry.losses); i++) {
      current = 0;
    }
  }
  return best;
}

/**
 * Computes the current win streak from match history.
 */
function computeCurrentWinStreak(matchHistory: DayWithLog[]): number {
  if (matchHistory.length === 0) return 0;
  const sorted = [...matchHistory].sort((a, b) =>
    a.day < b.day ? -1 : a.day > b.day ? 1 : 0,
  );
  const results: boolean[] = [];
  for (const entry of sorted) {
    for (let i = 0; i < Number(entry.wins); i++) results.push(true);
    for (let i = 0; i < Number(entry.losses); i++) results.push(false);
  }
  if (results.length === 0) return 0;
  let streak = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i]) streak += 1;
    else break;
  }
  return streak;
}

/**
 * Computes progress toward a badge's criteria given the user's stats and match history.
 */
export function computeBadgeProgress(
  definition: BadgeDefinition,
  stats: {
    wins: bigint;
    losses: bigint;
    totalGames: bigint;
    streak: bigint;
    bestStreak: bigint;
  } | null,
  matchHistory: DayWithLog[],
): BadgeProgress {
  const criteria: BadgeCriteria = definition.criteria;

  const safeStats = stats ?? {
    wins: 0n,
    losses: 0n,
    totalGames: 0n,
    streak: 0n,
    bestStreak: 0n,
  };

  switch (criteria.__kind__) {
    case "totalWins": {
      const required = Number(criteria.totalWins);
      const current = Number(safeStats.wins);
      return {
        current,
        required,
        percentage:
          required > 0
            ? Math.min(100, Math.round((current / required) * 100))
            : 0,
      };
    }
    case "winsStreak": {
      const required = Number(criteria.winsStreak);
      const current = computeCurrentWinStreak(matchHistory);
      return {
        current,
        required,
        percentage:
          required > 0
            ? Math.min(100, Math.round((current / required) * 100))
            : 0,
      };
    }
    case "totalGames": {
      const required = Number(criteria.totalGames);
      const current = Number(safeStats.totalGames);
      return {
        current,
        required,
        percentage:
          required > 0
            ? Math.min(100, Math.round((current / required) * 100))
            : 0,
      };
    }
    case "totalGamesPlayed": {
      const required = Number(criteria.totalGamesPlayed);
      const current = Number(safeStats.totalGames);
      return {
        current,
        required,
        percentage:
          required > 0
            ? Math.min(100, Math.round((current / required) * 100))
            : 0,
      };
    }
    case "bestWinStreak": {
      const required = Number(criteria.bestWinStreak);
      const current = computeBestWinStreak(matchHistory);
      return {
        current,
        required,
        percentage:
          required > 0
            ? Math.min(100, Math.round((current / required) * 100))
            : 0,
      };
    }
    case "winPercentage": {
      const required = Number(criteria.winPercentage);
      const total = Number(safeStats.wins) + Number(safeStats.losses);
      const current =
        total > 0 ? Math.round((Number(safeStats.wins) / total) * 100) : 0;
      return {
        current,
        required,
        percentage:
          required > 0
            ? Math.min(100, Math.round((current / required) * 100))
            : 0,
      };
    }
    case "totalDaysAvailable": {
      const required = Number(criteria.totalDaysAvailable);
      const current = matchHistory.length;
      return {
        current,
        required,
        percentage:
          required > 0
            ? Math.min(100, Math.round((current / required) * 100))
            : 0,
      };
    }
    case "firstMatchLogged": {
      const required = 1;
      const current = Number(safeStats.totalGames) > 0 ? 1 : 0;
      return { current, required, percentage: current >= required ? 100 : 0 };
    }
    case "firstImageUploaded": {
      // Can't easily compute from stats alone; show 0/1
      return { current: 0, required: 1, percentage: 0 };
    }
    case "totalChatMessages": {
      const required = Number(criteria.totalChatMessages);
      return { current: 0, required, percentage: 0 };
    }
    case "totalLikesReceived": {
      const required = Number(criteria.totalLikesReceived);
      return { current: 0, required, percentage: 0 };
    }
    case "topLeaderboardPosition": {
      const required = Number(criteria.topLeaderboardPosition);
      return { current: 0, required, percentage: 0 };
    }
    case "daysAtNumber1": {
      const required = Number(criteria.daysAtNumber1);
      return { current: 0, required, percentage: 0 };
    }
    case "monthlyParticipation": {
      const required = Number(criteria.monthlyParticipation.matchesThreshold);
      return { current: 0, required, percentage: 0 };
    }
    case "consecutiveWeeksAvailable": {
      const required = Number(criteria.consecutiveWeeksAvailable);
      return { current: 0, required, percentage: 0 };
    }
    default:
      return { current: 0, required: 1, percentage: 0 };
  }
}

/**
 * Returns a human-readable label for the progress count (e.g. "3/10 wins").
 */
export function getBadgeProgressLabel(
  definition: BadgeDefinition,
  progress: BadgeProgress,
): string {
  const criteria = definition.criteria;
  switch (criteria.__kind__) {
    case "totalWins":
      return `${progress.current}/${progress.required} wins`;
    case "winsStreak":
      return `${progress.current}/${progress.required} win streak`;
    case "totalGames":
    case "totalGamesPlayed":
      return `${progress.current}/${progress.required} games`;
    case "bestWinStreak":
      return `${progress.current}/${progress.required} best streak`;
    case "winPercentage":
      return `${progress.current}%/${progress.required}% win rate`;
    case "totalDaysAvailable":
      return `${progress.current}/${progress.required} days available`;
    case "firstMatchLogged":
      return progress.current >= 1 ? "Completed" : "Log your first match";
    case "firstImageUploaded":
      return "Upload an image in chat";
    case "totalChatMessages":
      return `${progress.current}/${progress.required} messages`;
    case "totalLikesReceived":
      return `${progress.current}/${progress.required} likes`;
    case "topLeaderboardPosition":
      return `Reach top ${progress.required}`;
    case "daysAtNumber1":
      return `${progress.current}/${progress.required} days at #1`;
    case "monthlyParticipation":
      return `${progress.current}/${progress.required} matches this month`;
    case "consecutiveWeeksAvailable":
      return `${progress.current}/${progress.required} consecutive weeks`;
    default:
      return `${progress.current}/${progress.required}`;
  }
}
