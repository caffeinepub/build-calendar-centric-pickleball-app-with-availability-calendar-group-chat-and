import type { Principal } from "@dfinity/principal";
import {
  BarChart2,
  Calendar,
  CheckCircle,
  Clock,
  Heart,
  Image,
  Loader2,
  MessageSquare,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { BadgeCriteria } from "../../backend";
import {
  useAwardBadgeToUser,
  useGetAllBadgeDefinitions,
  useGetAllRegisteredUsers,
  useGetUserBadges,
  useRevokeBadgeFromUser,
} from "../../hooks/useQueries";
import { InlineLoading } from "../common/LoadingState";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import { Switch } from "../ui/switch";

function getBadgeIcon(criteria: BadgeCriteria) {
  switch (criteria.__kind__) {
    case "totalWins":
      return <Trophy className="h-4 w-4" />;
    case "winsStreak":
    case "bestWinStreak":
      return <Zap className="h-4 w-4" />;
    case "totalGames":
    case "totalGamesPlayed":
      return <Target className="h-4 w-4" />;
    case "winPercentage":
      return <TrendingUp className="h-4 w-4" />;
    case "totalDaysAvailable":
    case "consecutiveWeeksAvailable":
      return <Calendar className="h-4 w-4" />;
    case "totalChatMessages":
      return <MessageSquare className="h-4 w-4" />;
    case "totalLikesReceived":
      return <Heart className="h-4 w-4" />;
    case "firstImageUploaded":
      return <Image className="h-4 w-4" />;
    case "topLeaderboardPosition":
    case "daysAtNumber1":
      return <BarChart2 className="h-4 w-4" />;
    case "monthlyParticipation":
      return <Clock className="h-4 w-4" />;
    case "firstMatchLogged":
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <Star className="h-4 w-4" />;
  }
}

function getCriteriaDescription(criteria: BadgeCriteria): string {
  switch (criteria.__kind__) {
    case "totalWins":
      return `${criteria.totalWins} total wins`;
    case "winsStreak":
      return `${criteria.winsStreak}-game win streak`;
    case "totalGames":
      return `${criteria.totalGames} total games`;
    case "totalDaysAvailable":
      return `${criteria.totalDaysAvailable} days with availability`;
    case "totalGamesPlayed":
      return `${criteria.totalGamesPlayed} total games played`;
    case "firstMatchLogged":
      return "First match logged";
    case "winPercentage":
      return `${criteria.winPercentage}% win rate`;
    case "bestWinStreak":
      return `Best win streak of ${criteria.bestWinStreak}`;
    case "totalChatMessages":
      return `${criteria.totalChatMessages} chat messages`;
    case "totalLikesReceived":
      return `${criteria.totalLikesReceived} likes received`;
    case "firstImageUploaded":
      return "First image uploaded in chat";
    case "topLeaderboardPosition":
      return `Reach top ${criteria.topLeaderboardPosition} on leaderboard`;
    case "daysAtNumber1":
      return `Hold #1 for ${criteria.daysAtNumber1} days`;
    case "monthlyParticipation": {
      const m = criteria.monthlyParticipation;
      return `${m.matchesThreshold}+ matches in month ${m.month} of ${m.year}`;
    }
    case "consecutiveWeeksAvailable":
      return `${criteria.consecutiveWeeksAvailable} consecutive weeks available`;
    default:
      return "Custom criteria";
  }
}

export default function AdminBadgeAwardPanel() {
  const { data: users = [], isLoading: usersLoading } =
    useGetAllRegisteredUsers();
  const { data: badges = [], isLoading: badgesLoading } =
    useGetAllBadgeDefinitions();
  const [selectedUserPrincipal, setSelectedUserPrincipal] =
    useState<string>("");

  const selectedUser = users.find(
    ([p]) => p.toString() === selectedUserPrincipal,
  );
  const selectedPrincipal: Principal | null = selectedUser
    ? selectedUser[0]
    : null;

  const { data: earnedBadgeIds = [], isLoading: loadingUserBadges } =
    useGetUserBadges(selectedPrincipal);
  const awardMutation = useAwardBadgeToUser();
  const revokeMutation = useRevokeBadgeFromUser();

  const earnedSet = new Set(earnedBadgeIds);

  // Track per-badge pending state
  const [pendingBadgeId, setPendingBadgeId] = useState<string | null>(null);

  const handleToggle = async (badgeId: string, currentlyEarned: boolean) => {
    if (!selectedPrincipal || pendingBadgeId) return;

    setPendingBadgeId(badgeId);

    try {
      if (currentlyEarned) {
        await revokeMutation.mutateAsync({ user: selectedPrincipal, badgeId });
        toast.success("Badge revoked successfully");
      } else {
        await awardMutation.mutateAsync({ user: selectedPrincipal, badgeId });
        toast.success("Badge awarded successfully");
      }
    } catch (error: any) {
      toast.error(
        error?.message ||
          (currentlyEarned
            ? "Failed to revoke badge"
            : "Failed to award badge"),
      );
    } finally {
      setPendingBadgeId(null);
    }
  };

  return (
    <div className="space-y-4" data-ocid="admin.badge_award.panel">
      {/* User selector */}
      <div className="space-y-1.5">
        <Label htmlFor="award-user-select">Select Player</Label>
        {usersLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select
            value={selectedUserPrincipal}
            onValueChange={setSelectedUserPrincipal}
          >
            <SelectTrigger
              id="award-user-select"
              data-ocid="admin.badge_award.select"
            >
              <SelectValue placeholder="Choose a player to manage badges..." />
            </SelectTrigger>
            <SelectContent>
              {users.map(([principal, profile]) => (
                <SelectItem
                  key={principal.toString()}
                  value={principal.toString()}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">
                      {profile.name || "Unnamed"}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                      {principal.toString().slice(0, 12)}…
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Badge list for selected user */}
      {selectedPrincipal && (
        <div className="space-y-2">
          {badgesLoading || loadingUserBadges ? (
            <InlineLoading message="Loading badges..." />
          ) : badges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No badge definitions found. Create badges in Badge Management
              above.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Toggle badges on to award, off to revoke. Changes take effect
                immediately.
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {badges.map((badge, idx) => {
                  const isEarned = earnedSet.has(badge.id);
                  const isPending = pendingBadgeId === badge.id;

                  return (
                    <div
                      key={badge.id}
                      data-ocid={`admin.badge.item.${idx + 1}`}
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors ${
                        isEarned
                          ? "bg-green-500/5 border-green-500/20"
                          : "bg-card border-border"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`flex-shrink-0 p-1.5 rounded-md mt-0.5 ${
                            isEarned
                              ? "bg-green-500/10 text-green-600"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {getBadgeIcon(badge.criteria)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {badge.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {badge.description}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            {getCriteriaDescription(badge.criteria)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isPending && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        )}
                        <Switch
                          data-ocid={`admin.badge.switch.${idx + 1}`}
                          checked={isEarned}
                          disabled={isPending || !!pendingBadgeId}
                          onCheckedChange={() =>
                            handleToggle(badge.id, isEarned)
                          }
                          aria-label={
                            isEarned
                              ? `Revoke ${badge.name}`
                              : `Award ${badge.name}`
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {!selectedPrincipal && !usersLoading && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Select a player above to manage their badges.
        </p>
      )}
    </div>
  );
}
