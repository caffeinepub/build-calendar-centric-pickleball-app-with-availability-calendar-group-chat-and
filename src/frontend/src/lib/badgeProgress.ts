import type { BadgeCriteria, BadgeDefinition, DayWithLog } from "../backend";

export interface BadgeProgress {
  current: number;
  required: number;
  percentage: number;
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
      const current = Number(safeStats.streak);
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
      const current = Number(safeStats.bestStreak);
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
