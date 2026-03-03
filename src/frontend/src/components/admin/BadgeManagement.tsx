import {
  BarChart2,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Image,
  MessageSquare,
  Pencil,
  Percent,
  Plus,
  Star,
  Target,
  ThumbsUp,
  Trash2,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { BadgeCriteria, BadgeDefinition } from "../../backend";
import {
  useCreateBadgeDefinition,
  useDeleteBadgeDefinition,
  useGetAllBadgeDefinitions,
  useUpdateBadgeDefinition,
} from "../../hooks/useQueries";
import { InlineLoading } from "../common/LoadingState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

type CriteriaType =
  | "totalWins"
  | "winsStreak"
  | "totalGames"
  | "totalDaysAvailable"
  | "totalGamesPlayed"
  | "firstMatchLogged"
  | "winPercentage"
  | "bestWinStreak"
  | "totalChatMessages"
  | "totalLikesReceived"
  | "firstImageUploaded"
  | "topLeaderboardPosition"
  | "daysAtNumber1"
  | "monthlyParticipation"
  | "consecutiveWeeksAvailable";

interface BadgeFormState {
  id: string;
  name: string;
  description: string;
  criteriaType: CriteriaType;
  threshold: string;
  // monthlyParticipation specific fields
  monthYear: string;
  monthMonth: string;
  monthMatchesThreshold: string;
}

const CRITERIA_LABELS: Record<CriteriaType, string> = {
  totalWins: "Total Wins",
  winsStreak: "Win Streak",
  totalGames: "Total Games Played",
  totalDaysAvailable: "Total Days Available",
  totalGamesPlayed: "Total Games Played (Activity)",
  firstMatchLogged: "First Match Logged",
  winPercentage: "Win Percentage (%)",
  bestWinStreak: "Best Win Streak",
  totalChatMessages: "Total Chat Messages",
  totalLikesReceived: "Total Likes Received",
  firstImageUploaded: "First Image Uploaded",
  topLeaderboardPosition: "Top Leaderboard Position (reach top N)",
  daysAtNumber1: "Days Held #1 Spot",
  monthlyParticipation: "Monthly Participation",
  consecutiveWeeksAvailable: "Consecutive Weeks Available",
};

const CRITERIA_ICONS: Record<CriteriaType, React.ReactNode> = {
  totalWins: <Trophy className="h-4 w-4" />,
  winsStreak: <Zap className="h-4 w-4" />,
  totalGames: <Target className="h-4 w-4" />,
  totalDaysAvailable: <Calendar className="h-4 w-4" />,
  totalGamesPlayed: <Target className="h-4 w-4" />,
  firstMatchLogged: <Star className="h-4 w-4" />,
  winPercentage: <Percent className="h-4 w-4" />,
  bestWinStreak: <Flame className="h-4 w-4" />,
  totalChatMessages: <MessageSquare className="h-4 w-4" />,
  totalLikesReceived: <ThumbsUp className="h-4 w-4" />,
  firstImageUploaded: <Image className="h-4 w-4" />,
  topLeaderboardPosition: <BarChart2 className="h-4 w-4" />,
  daysAtNumber1: <Trophy className="h-4 w-4" />,
  monthlyParticipation: <Calendar className="h-4 w-4" />,
  consecutiveWeeksAvailable: <Clock className="h-4 w-4" />,
};

// Criteria types that use a simple numeric threshold
const SIMPLE_THRESHOLD_TYPES: CriteriaType[] = [
  "totalWins",
  "winsStreak",
  "totalGames",
  "totalDaysAvailable",
  "totalGamesPlayed",
  "firstMatchLogged",
  "winPercentage",
  "bestWinStreak",
  "totalChatMessages",
  "totalLikesReceived",
  "firstImageUploaded",
  "topLeaderboardPosition",
  "daysAtNumber1",
  "consecutiveWeeksAvailable",
];

const THRESHOLD_PLACEHOLDERS: Partial<Record<CriteriaType, string>> = {
  totalWins: "e.g. 10",
  winsStreak: "e.g. 5",
  totalGames: "e.g. 50",
  totalDaysAvailable: "e.g. 25",
  totalGamesPlayed: "e.g. 100",
  firstMatchLogged: "1",
  winPercentage: "e.g. 75 (percent)",
  bestWinStreak: "e.g. 10",
  totalChatMessages: "e.g. 20",
  totalLikesReceived: "e.g. 50",
  firstImageUploaded: "1",
  topLeaderboardPosition: "e.g. 3 (top 3)",
  daysAtNumber1: "e.g. 7",
  consecutiveWeeksAvailable: "e.g. 4",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function criteriaFromForm(
  type: CriteriaType,
  form: BadgeFormState,
): BadgeCriteria {
  if (type === "monthlyParticipation") {
    return {
      __kind__: "monthlyParticipation",
      monthlyParticipation: {
        year: BigInt(
          Number.parseInt(form.monthYear, 10) || new Date().getFullYear(),
        ),
        month: BigInt(Number.parseInt(form.monthMonth, 10) || 1),
        matchesThreshold: BigInt(
          Number.parseInt(form.monthMatchesThreshold, 10) || 1,
        ),
      },
    };
  }

  const threshold = BigInt(Number.parseInt(form.threshold, 10));

  switch (type) {
    case "totalWins":
      return { __kind__: "totalWins", totalWins: threshold };
    case "winsStreak":
      return { __kind__: "winsStreak", winsStreak: threshold };
    case "totalGames":
      return { __kind__: "totalGames", totalGames: threshold };
    case "totalDaysAvailable":
      return { __kind__: "totalDaysAvailable", totalDaysAvailable: threshold };
    case "totalGamesPlayed":
      return { __kind__: "totalGamesPlayed", totalGamesPlayed: threshold };
    case "firstMatchLogged":
      return { __kind__: "firstMatchLogged", firstMatchLogged: threshold };
    case "winPercentage":
      return { __kind__: "winPercentage", winPercentage: threshold };
    case "bestWinStreak":
      return { __kind__: "bestWinStreak", bestWinStreak: threshold };
    case "totalChatMessages":
      return { __kind__: "totalChatMessages", totalChatMessages: threshold };
    case "totalLikesReceived":
      return { __kind__: "totalLikesReceived", totalLikesReceived: threshold };
    case "firstImageUploaded":
      return { __kind__: "firstImageUploaded", firstImageUploaded: threshold };
    case "topLeaderboardPosition":
      return {
        __kind__: "topLeaderboardPosition",
        topLeaderboardPosition: threshold,
      };
    case "daysAtNumber1":
      return { __kind__: "daysAtNumber1", daysAtNumber1: threshold };
    case "consecutiveWeeksAvailable":
      return {
        __kind__: "consecutiveWeeksAvailable",
        consecutiveWeeksAvailable: threshold,
      };
  }
}

function criteriaToForm(criteria: BadgeCriteria): Partial<BadgeFormState> {
  switch (criteria.__kind__) {
    case "totalWins":
      return {
        criteriaType: "totalWins",
        threshold: criteria.totalWins.toString(),
      };
    case "winsStreak":
      return {
        criteriaType: "winsStreak",
        threshold: criteria.winsStreak.toString(),
      };
    case "totalGames":
      return {
        criteriaType: "totalGames",
        threshold: criteria.totalGames.toString(),
      };
    case "totalDaysAvailable":
      return {
        criteriaType: "totalDaysAvailable",
        threshold: criteria.totalDaysAvailable.toString(),
      };
    case "totalGamesPlayed":
      return {
        criteriaType: "totalGamesPlayed",
        threshold: criteria.totalGamesPlayed.toString(),
      };
    case "firstMatchLogged":
      return {
        criteriaType: "firstMatchLogged",
        threshold: criteria.firstMatchLogged.toString(),
      };
    case "winPercentage":
      return {
        criteriaType: "winPercentage",
        threshold: criteria.winPercentage.toString(),
      };
    case "bestWinStreak":
      return {
        criteriaType: "bestWinStreak",
        threshold: criteria.bestWinStreak.toString(),
      };
    case "totalChatMessages":
      return {
        criteriaType: "totalChatMessages",
        threshold: criteria.totalChatMessages.toString(),
      };
    case "totalLikesReceived":
      return {
        criteriaType: "totalLikesReceived",
        threshold: criteria.totalLikesReceived.toString(),
      };
    case "firstImageUploaded":
      return {
        criteriaType: "firstImageUploaded",
        threshold: criteria.firstImageUploaded.toString(),
      };
    case "topLeaderboardPosition":
      return {
        criteriaType: "topLeaderboardPosition",
        threshold: criteria.topLeaderboardPosition.toString(),
      };
    case "daysAtNumber1":
      return {
        criteriaType: "daysAtNumber1",
        threshold: criteria.daysAtNumber1.toString(),
      };
    case "monthlyParticipation":
      return {
        criteriaType: "monthlyParticipation",
        monthYear: criteria.monthlyParticipation.year.toString(),
        monthMonth: criteria.monthlyParticipation.month.toString(),
        monthMatchesThreshold:
          criteria.monthlyParticipation.matchesThreshold.toString(),
      };
    case "consecutiveWeeksAvailable":
      return {
        criteriaType: "consecutiveWeeksAvailable",
        threshold: criteria.consecutiveWeeksAvailable.toString(),
      };
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
      return `${criteria.totalDaysAvailable} days with availability set`;
    case "totalGamesPlayed":
      return `${criteria.totalGamesPlayed} total games played`;
    case "firstMatchLogged":
      return "First match logged";
    case "winPercentage":
      return `${criteria.winPercentage}% win rate`;
    case "bestWinStreak":
      return `Best win streak of ${criteria.bestWinStreak}`;
    case "totalChatMessages":
      return `${criteria.totalChatMessages} chat messages posted`;
    case "totalLikesReceived":
      return `${criteria.totalLikesReceived} likes received`;
    case "firstImageUploaded":
      return "First image uploaded in chat";
    case "topLeaderboardPosition":
      return `Reach top ${criteria.topLeaderboardPosition} on leaderboard`;
    case "daysAtNumber1":
      return `Hold #1 spot for ${criteria.daysAtNumber1} days`;
    case "monthlyParticipation": {
      const m = criteria.monthlyParticipation;
      const monthName = MONTH_NAMES[Number(m.month) - 1] ?? `Month ${m.month}`;
      return `${m.matchesThreshold}+ matches in ${monthName} ${m.year}`;
    }
    case "consecutiveWeeksAvailable":
      return `${criteria.consecutiveWeeksAvailable} consecutive weeks available`;
  }
}

const emptyForm: BadgeFormState = {
  id: "",
  name: "",
  description: "",
  criteriaType: "totalWins",
  threshold: "10",
  monthYear: new Date().getFullYear().toString(),
  monthMonth: "1",
  monthMatchesThreshold: "1",
};

const BADGE_ORDER_KEY = "badgeDisplayOrder";

function loadBadgeOrder(): string[] {
  try {
    const stored = localStorage.getItem(BADGE_ORDER_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveBadgeOrder(order: string[]) {
  try {
    localStorage.setItem(BADGE_ORDER_KEY, JSON.stringify(order));
  } catch {
    // ignore storage errors
  }
}

export default function BadgeManagement() {
  const { data: badges = [], isLoading } = useGetAllBadgeDefinitions();
  const createMutation = useCreateBadgeDefinition();
  const updateMutation = useUpdateBadgeDefinition();
  const deleteMutation = useDeleteBadgeDefinition();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BadgeFormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [badgeOrder, setBadgeOrder] = useState<string[]>(() =>
    loadBadgeOrder(),
  );

  const isEditing = editingId !== null;
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isMonthly = form.criteriaType === "monthlyParticipation";
  const isSimpleThreshold = SIMPLE_THRESHOLD_TYPES.includes(form.criteriaType);

  // Sort badges according to stored order; badges not in the order go to the end
  const sortedBadges = [...badges].sort((a, b) => {
    const ai = badgeOrder.indexOf(a.id);
    const bi = badgeOrder.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const moveBadge = (badgeId: string, direction: "up" | "down") => {
    // Build ordered list of all current badge IDs in displayed order
    const currentOrder = sortedBadges.map((b) => b.id);
    const idx = currentOrder.indexOf(badgeId);
    if (idx === -1) return;

    const newOrder = [...currentOrder];
    if (direction === "up" && idx > 0) {
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    } else if (direction === "down" && idx < newOrder.length - 1) {
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    } else {
      return;
    }

    saveBadgeOrder(newOrder);
    setBadgeOrder(newOrder);
  };

  const openCreate = () => {
    setForm({ ...emptyForm, id: `badge-${Date.now()}` });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (badge: BadgeDefinition) => {
    const partial = criteriaToForm(badge.criteria);
    setForm({
      ...emptyForm,
      id: badge.id,
      name: badge.name,
      description: badge.description,
      ...partial,
    });
    setEditingId(badge.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Badge name is required");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Badge description is required");
      return;
    }

    if (isMonthly) {
      const year = Number.parseInt(form.monthYear, 10);
      const month = Number.parseInt(form.monthMonth, 10);
      const matches = Number.parseInt(form.monthMatchesThreshold, 10);
      if (Number.isNaN(year) || year < 2020 || year > 2100) {
        toast.error("Please enter a valid year (2020–2100)");
        return;
      }
      if (Number.isNaN(month) || month < 1 || month > 12) {
        toast.error("Please select a valid month");
        return;
      }
      if (Number.isNaN(matches) || matches <= 0) {
        toast.error("Matches threshold must be a positive number");
        return;
      }
    } else {
      const thresholdNum = Number.parseInt(form.threshold, 10);
      if (Number.isNaN(thresholdNum) || thresholdNum <= 0) {
        toast.error("Threshold must be a positive number");
        return;
      }
    }

    const definition: BadgeDefinition = {
      id: form.id,
      name: form.name.trim(),
      description: form.description.trim(),
      criteria: criteriaFromForm(form.criteriaType, form),
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync(definition);
        toast.success("Badge updated successfully");
      } else {
        await createMutation.mutateAsync(definition);
        toast.success("Badge created successfully");
      }
      closeForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to save badge");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success("Badge deleted successfully");
      setDeleteId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete badge");
    }
  };

  // Generate year options for monthly participation
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {badges.length} badge{badges.length !== 1 ? "s" : ""} defined
        </p>
        {!showForm && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            New Badge
          </Button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">
              {isEditing ? "Edit Badge" : "Create Badge"}
            </h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeForm}
              className="h-7 w-7"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="badge-name">Name</Label>
              <Input
                id="badge-name"
                placeholder="e.g. First Blood"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="badge-criteria">Criteria Type</Label>
              <Select
                value={form.criteriaType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, criteriaType: v as CriteriaType }))
                }
              >
                <SelectTrigger id="badge-criteria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CRITERIA_LABELS) as CriteriaType[]).map(
                    (type) => (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2">
                          {CRITERIA_ICONS[type]}
                          {CRITERIA_LABELS[type]}
                        </span>
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Simple threshold input */}
            {isSimpleThreshold && (
              <div className="space-y-1.5">
                <Label htmlFor="badge-threshold">
                  {form.criteriaType === "winPercentage"
                    ? "Win % Threshold"
                    : form.criteriaType === "topLeaderboardPosition"
                      ? "Top N Position"
                      : "Threshold"}
                </Label>
                <Input
                  id="badge-threshold"
                  type="number"
                  min="1"
                  max={
                    form.criteriaType === "winPercentage" ? "100" : undefined
                  }
                  placeholder={
                    THRESHOLD_PLACEHOLDERS[form.criteriaType] ?? "e.g. 10"
                  }
                  value={form.threshold}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, threshold: e.target.value }))
                  }
                />
                {form.criteriaType === "winPercentage" && (
                  <p className="text-xs text-muted-foreground">
                    Enter a value between 1 and 100
                  </p>
                )}
                {form.criteriaType === "topLeaderboardPosition" && (
                  <p className="text-xs text-muted-foreground">
                    Award when player reaches top N (e.g. 3 = top 3)
                  </p>
                )}
                {form.criteriaType === "firstMatchLogged" && (
                  <p className="text-xs text-muted-foreground">
                    Set to 1 — awarded on first match logged
                  </p>
                )}
                {form.criteriaType === "firstImageUploaded" && (
                  <p className="text-xs text-muted-foreground">
                    Set to 1 — awarded on first image uploaded
                  </p>
                )}
              </div>
            )}

            {/* Monthly participation fields */}
            {isMonthly && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="badge-month-year">Year</Label>
                  <Select
                    value={form.monthYear}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, monthYear: v }))
                    }
                  >
                    <SelectTrigger id="badge-month-year">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="badge-month-month">Month</Label>
                  <Select
                    value={form.monthMonth}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, monthMonth: v }))
                    }
                  >
                    <SelectTrigger id="badge-month-month">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((name) => {
                        const monthNum = MONTH_NAMES.indexOf(name) + 1;
                        return (
                          <SelectItem key={name} value={monthNum.toString()}>
                            {name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="badge-month-matches">Matches Required</Label>
                  <Input
                    id="badge-month-matches"
                    type="number"
                    min="1"
                    placeholder="e.g. 5"
                    value={form.monthMatchesThreshold}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        monthMatchesThreshold: e.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum matches played in that month
                  </p>
                </div>
              </>
            )}

            <div className={`space-y-1.5 ${isMonthly ? "" : "sm:col-span-2"}`}>
              <Label htmlFor="badge-description">Description</Label>
              <Textarea
                id="badge-description"
                placeholder="Describe what this badge represents..."
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={closeForm}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4" />
                  {isEditing ? "Update" : "Create"}
                </span>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Badge list */}
      {isLoading ? (
        <InlineLoading message="Loading badges..." />
      ) : badges.length === 0 ? (
        <p className="text-center text-muted-foreground py-6 text-sm">
          No badges defined yet. Create one to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {sortedBadges.map((badge, idx) => {
            const formData = criteriaToForm(badge.criteria);
            const iconType = (formData.criteriaType ??
              "totalWins") as CriteriaType;
            const isFirst = idx === 0;
            const isLast = idx === sortedBadges.length - 1;
            return (
              <div
                key={badge.id}
                data-ocid={`badge.item.${idx + 1}`}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card"
              >
                {/* Up/Down reorder arrows */}
                <div className="flex flex-col gap-0.5 flex-shrink-0 mt-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => moveBadge(badge.id, "up")}
                    disabled={isFirst || deleteMutation.isPending}
                    aria-label="Move badge up"
                    data-ocid={`badge.item.${idx + 1}`}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => moveBadge(badge.id, "down")}
                    disabled={isLast || deleteMutation.isPending}
                    aria-label="Move badge down"
                    data-ocid={`badge.item.${idx + 1}`}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0 p-1.5 rounded-md bg-primary/10 text-primary mt-0.5">
                    {CRITERIA_ICONS[iconType]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{badge.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {badge.description}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Criteria: {getCriteriaDescription(badge.criteria)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEdit(badge)}
                    disabled={deleteMutation.isPending}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(badge.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Badge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this badge? Players who have
              already earned it will keep it, but it will no longer be awarded
              to new players. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
