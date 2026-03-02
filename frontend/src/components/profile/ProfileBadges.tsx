import { Award, Star, Trophy, Zap, Target, TrendingUp, Calendar, MessageSquare, Heart, Image, BarChart2, Clock, CheckCircle } from 'lucide-react';
import type { BadgeDefinition, BadgeCriteria, DayWithLog } from '../../backend';
import type { T as UserStats } from '../../backend';
import { useGetAllBadgeDefinitions, useGetUserBadges } from '../../hooks/useQueries';
import type { Principal } from '@dfinity/principal';
import { Skeleton } from '../ui/skeleton';
import { Progress } from '../ui/progress';
import { computeBadgeProgress, getBadgeProgressLabel } from '../../lib/badgeProgress';

interface ProfileBadgesProps {
  userPrincipal: Principal | null;
  matchHistory?: DayWithLog[];
  userStats?: UserStats | null;
}

function getBadgeIcon(criteria: BadgeCriteria) {
  switch (criteria.__kind__) {
    case 'totalWins':
      return <Trophy className="h-5 w-5" />;
    case 'winsStreak':
    case 'bestWinStreak':
      return <Zap className="h-5 w-5" />;
    case 'totalGames':
    case 'totalGamesPlayed':
      return <Target className="h-5 w-5" />;
    case 'winPercentage':
      return <TrendingUp className="h-5 w-5" />;
    case 'totalDaysAvailable':
    case 'consecutiveWeeksAvailable':
      return <Calendar className="h-5 w-5" />;
    case 'totalChatMessages':
      return <MessageSquare className="h-5 w-5" />;
    case 'totalLikesReceived':
      return <Heart className="h-5 w-5" />;
    case 'firstImageUploaded':
      return <Image className="h-5 w-5" />;
    case 'topLeaderboardPosition':
    case 'daysAtNumber1':
      return <BarChart2 className="h-5 w-5" />;
    case 'monthlyParticipation':
      return <Clock className="h-5 w-5" />;
    case 'firstMatchLogged':
      return <CheckCircle className="h-5 w-5" />;
    default:
      return <Star className="h-5 w-5" />;
  }
}

const EARNED_BADGE_COLORS = [
  'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  'text-blue-500 bg-blue-500/10 border-blue-500/20',
  'text-purple-500 bg-purple-500/10 border-purple-500/20',
  'text-green-500 bg-green-500/10 border-green-500/20',
  'text-orange-500 bg-orange-500/10 border-orange-500/20',
  'text-pink-500 bg-pink-500/10 border-pink-500/20',
];

export default function ProfileBadges({ userPrincipal, matchHistory = [], userStats = null }: ProfileBadgesProps) {
  const { data: allDefinitions = [], isLoading: isLoadingDefs } = useGetAllBadgeDefinitions();
  const { data: earnedBadgeIds = [], isLoading: isLoadingBadges } = useGetUserBadges(userPrincipal);

  const isLoading = isLoadingDefs || isLoadingBadges;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
            <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (allDefinitions.length === 0) {
    return (
      <div className="text-center py-8">
        <Award className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">No badges defined yet.</p>
        <p className="text-muted-foreground text-xs mt-1">Ask an admin to create badge definitions.</p>
      </div>
    );
  }

  const earnedSet = new Set(earnedBadgeIds);

  // Separate earned and unearned
  const earnedDefs = allDefinitions.filter(d => earnedSet.has(d.id));
  const unearnedDefs = allDefinitions.filter(d => !earnedSet.has(d.id));

  return (
    <div className="space-y-5">
      {/* Earned badges */}
      {earnedDefs.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Earned ({earnedDefs.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {earnedDefs.map((badge, index) => {
              const colorClass = EARNED_BADGE_COLORS[index % EARNED_BADGE_COLORS.length];
              return (
                <div
                  key={badge.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${colorClass}`}
                >
                  <div className="flex-shrink-0 p-2 rounded-lg bg-current/10">
                    {getBadgeIcon(badge.criteria)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm truncate">{badge.name}</p>
                      <span className="text-xs">✓</span>
                    </div>
                    <p className="text-xs opacity-80 mt-0.5 line-clamp-2">{badge.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unearned badges with progress */}
      {unearnedDefs.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Star className="h-4 w-4" />
            In Progress ({unearnedDefs.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {unearnedDefs.map((badge) => {
              const progress = computeBadgeProgress(badge, userStats, matchHistory);
              const progressLabel = getBadgeProgressLabel(badge, progress);
              return (
                <div
                  key={badge.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30 opacity-80"
                >
                  <div className="flex-shrink-0 p-2 rounded-lg bg-muted text-muted-foreground">
                    {getBadgeIcon(badge.criteria)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="font-semibold text-sm text-foreground truncate">{badge.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{badge.description}</p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{progressLabel}</span>
                        <span className="text-xs font-medium text-muted-foreground">{progress.percentage}%</span>
                      </div>
                      <Progress value={progress.percentage} className="h-1.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {earnedDefs.length === 0 && unearnedDefs.length === 0 && (
        <div className="text-center py-8">
          <Award className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No badges available yet.</p>
        </div>
      )}
    </div>
  );
}
