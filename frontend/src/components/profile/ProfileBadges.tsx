import { Award, Star, Trophy, Zap, Target, TrendingUp } from 'lucide-react';
import type { BadgeDefinition, BadgeCriteria } from '../../backend';
import { useGetAllBadgeDefinitions, useGetUserBadges } from '../../hooks/useQueries';
import type { Principal } from '@dfinity/principal';
import { Skeleton } from '../ui/skeleton';

interface ProfileBadgesProps {
  userPrincipal: Principal | null;
}

function getBadgeIcon(criteria: BadgeCriteria) {
  switch (criteria.__kind__) {
    case 'totalWins':
      return <Trophy className="h-5 w-5" />;
    case 'winsStreak':
      return <Zap className="h-5 w-5" />;
    case 'totalGames':
      return <Target className="h-5 w-5" />;
    default:
      return <Star className="h-5 w-5" />;
  }
}

function getCriteriaLabel(criteria: BadgeCriteria): string {
  switch (criteria.__kind__) {
    case 'totalWins':
      return `${criteria.totalWins} total wins`;
    case 'winsStreak':
      return `${criteria.winsStreak}-game win streak`;
    case 'totalGames':
      return `${criteria.totalGames} total games`;
    default:
      return '';
  }
}

const BADGE_COLORS = [
  'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  'text-blue-500 bg-blue-500/10 border-blue-500/20',
  'text-purple-500 bg-purple-500/10 border-purple-500/20',
  'text-green-500 bg-green-500/10 border-green-500/20',
  'text-orange-500 bg-orange-500/10 border-orange-500/20',
];

function getBadgeColor(index: number): string {
  return BADGE_COLORS[index % BADGE_COLORS.length];
}

export default function ProfileBadges({ userPrincipal }: ProfileBadgesProps) {
  const { data: allBadges = [], isLoading: badgesLoading } = useGetAllBadgeDefinitions();
  const { data: earnedBadgeIds = [], isLoading: awardsLoading } = useGetUserBadges(userPrincipal);

  const isLoading = badgesLoading || awardsLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const earnedBadges: BadgeDefinition[] = allBadges.filter(b => earnedBadgeIds.includes(b.id));

  if (earnedBadges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
        <Award className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">No badges earned yet.</p>
        <p className="text-muted-foreground/60 text-xs">Keep playing to unlock achievements!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {earnedBadges.map((badge, index) => (
        <div
          key={badge.id}
          className={`flex items-start gap-3 p-3 rounded-lg border ${getBadgeColor(index)}`}
        >
          <div className={`flex-shrink-0 p-2 rounded-full border ${getBadgeColor(index)}`}>
            {getBadgeIcon(badge.criteria)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight">{badge.name}</p>
            <p className="text-xs opacity-80 mt-0.5 leading-snug">{badge.description}</p>
            <p className="text-xs opacity-60 mt-1">
              {getCriteriaLabel(badge.criteria)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
