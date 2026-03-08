import type { BadgeDefinition } from "../../backend";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface SeasonChampionBadgeProps {
  earnedBadgeIds: string[];
  allDefinitions: BadgeDefinition[];
}

/**
 * Renders a small 🏆 pill badge next to a player's name if they hold the
 * Season Champion badge. Uses a single shared design so size, border, and
 * hover behaviour are identical everywhere it appears (profile, leaderboard,
 * chat).
 */
export default function SeasonChampionBadge({
  earnedBadgeIds,
  allDefinitions,
}: SeasonChampionBadgeProps) {
  const championDef = allDefinitions.find(
    (d) =>
      d.id === "season-champion" ||
      d.name.toLowerCase().includes("season champion"),
  );

  if (!championDef || !earnedBadgeIds.includes(championDef.id)) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/20 text-yellow-600 border border-yellow-500/40 cursor-default select-none whitespace-nowrap dark:text-yellow-400 dark:bg-yellow-500/10 dark:border-yellow-500/30"
          aria-label={championDef.name}
        >
          🏆
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{championDef.name}</p>
      </TooltipContent>
    </Tooltip>
  );
}
