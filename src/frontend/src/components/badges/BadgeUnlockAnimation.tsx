import {
  Award,
  BarChart2,
  Calendar,
  CheckCircle,
  Clock,
  Heart,
  Image,
  MessageSquare,
  Star,
  Target,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BadgeCriteria, BadgeDefinition } from "../../backend";
import { Button } from "../ui/button";

interface BadgeUnlockAnimationProps {
  badge: BadgeDefinition;
  /** Current streak value, used when badge is streak-based */
  currentStreak?: number;
  onDismiss: () => void;
}

type Stage = "streak" | "progress" | "reveal" | "done";

function getBadgeIcon(criteria: BadgeCriteria, size = "h-12 w-12") {
  switch (criteria.__kind__) {
    case "totalWins":
      return <Trophy className={size} />;
    case "winsStreak":
    case "bestWinStreak":
      return <Zap className={size} />;
    case "totalGames":
    case "totalGamesPlayed":
      return <Target className={size} />;
    case "winPercentage":
      return <TrendingUp className={size} />;
    case "totalDaysAvailable":
    case "consecutiveWeeksAvailable":
      return <Calendar className={size} />;
    case "totalChatMessages":
      return <MessageSquare className={size} />;
    case "totalLikesReceived":
      return <Heart className={size} />;
    case "firstImageUploaded":
      return <Image className={size} />;
    case "topLeaderboardPosition":
    case "daysAtNumber1":
      return <BarChart2 className={size} />;
    case "monthlyParticipation":
      return <Clock className={size} />;
    case "firstMatchLogged":
      return <CheckCircle className={size} />;
    default:
      return <Star className={size} />;
  }
}

function isStreakBased(criteria: BadgeCriteria): boolean {
  return (
    criteria.__kind__ === "winsStreak" || criteria.__kind__ === "bestWinStreak"
  );
}

export default function BadgeUnlockAnimation({
  badge,
  currentStreak = 0,
  onDismiss,
}: BadgeUnlockAnimationProps) {
  const [stage, setStage] = useState<Stage>(
    isStreakBased(badge.criteria) ? "streak" : "progress",
  );
  const [progressValue, setProgressValue] = useState(0);
  const [streakDisplay, setStreakDisplay] = useState(
    Math.max(0, currentStreak - 1),
  );
  const [revealed, setRevealed] = useState(false);
  const [visible, setVisible] = useState(false);
  const dismissedRef = useRef(false);

  const handleDismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    onDismiss();
  }, [onDismiss]);

  // Fade-in overlay on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 16);
    return () => clearTimeout(t);
  }, []);

  // Keyboard dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleDismiss]);

  // Stage timeline
  useEffect(() => {
    if (stage === "streak") {
      const target = currentStreak;
      const start = Math.max(0, target - 1);
      let current = start;
      const steps = target - start;
      if (steps <= 0) {
        setStage("progress");
        return;
      }
      const interval = 400 / steps;
      const timer = setInterval(() => {
        current += 1;
        setStreakDisplay(current);
        if (current >= target) {
          clearInterval(timer);
          setTimeout(() => setStage("progress"), 150);
        }
      }, interval);
      return () => clearInterval(timer);
    }

    if (stage === "progress") {
      setProgressValue(0);
      let start: number | null = null;
      const duration = 600;
      let rafId: number;

      const animate = (timestamp: number) => {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const pct = Math.min(100, Math.round((elapsed / duration) * 100));
        setProgressValue(pct);
        if (pct < 100) {
          rafId = requestAnimationFrame(animate);
        } else {
          setTimeout(() => setStage("reveal"), 100);
        }
      };
      rafId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(rafId);
    }

    if (stage === "reveal") {
      const t = setTimeout(() => setRevealed(true), 50);
      const autoDismiss = setTimeout(() => setStage("done"), 1800);
      return () => {
        clearTimeout(t);
        clearTimeout(autoDismiss);
      };
    }

    if (stage === "done") {
      handleDismiss();
    }
  }, [stage, currentStreak, handleDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "rgba(0,0,0,0.75)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.2s ease",
      }}
      onClick={handleDismiss}
      onKeyDown={(e) => e.key === "Escape" && handleDismiss()}
      aria-hidden="true"
      data-ocid="badge.modal"
    >
      {/* Skip button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10"
        onClick={handleDismiss}
        aria-label="Skip animation"
        data-ocid="badge.close_button"
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Card — stop propagation so clicking the card doesn't dismiss */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: inner card suppresses propagation only */}
      <div
        className="relative mx-4 w-full max-w-sm rounded-2xl p-8 flex flex-col items-center gap-6 text-center"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.18 0.03 145), oklch(0.12 0.02 145))",
          border: "1px solid oklch(0.55 0.22 145 / 0.3)",
          boxShadow:
            "0 0 60px oklch(0.55 0.22 145 / 0.25), 0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Badge unlocked header */}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">
            Badge Unlocked
          </p>
          <p className="text-white/90 text-sm font-medium">
            Keep up the great work!
          </p>
        </div>

        {/* Streak counter (only for streak-based badges) */}
        {isStreakBased(badge.criteria) && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-white/60 uppercase tracking-wide">
              Win Streak
            </span>
            <span
              className="text-5xl font-bold tabular-nums"
              style={{
                color: "oklch(0.85 0.28 130)",
                textShadow: "0 0 20px oklch(0.85 0.28 130 / 0.6)",
                transition: "all 0.15s ease",
              }}
            >
              🔥 {streakDisplay}
            </span>
          </div>
        )}

        {/* Progress bar */}
        {(stage === "progress" || stage === "reveal" || stage === "done") && (
          <div className="w-full space-y-1.5">
            <div className="flex justify-between text-xs text-white/50">
              <span>Progress</span>
              <span>{progressValue}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progressValue}%`,
                  background:
                    "linear-gradient(90deg, oklch(0.65 0.25 130), oklch(0.85 0.28 130))",
                  transition: "width 0.016s linear",
                  boxShadow: "0 0 8px oklch(0.75 0.27 130 / 0.7)",
                }}
              />
            </div>
          </div>
        )}

        {/* Badge reveal */}
        {(stage === "reveal" || stage === "done") && (
          <div
            className="flex flex-col items-center gap-3"
            style={{
              transform: revealed ? "scale(1)" : "scale(0.4)",
              opacity: revealed ? 1 : 0,
              transition:
                "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease",
            }}
          >
            {/* Badge icon with glow */}
            <div
              className="p-5 rounded-full"
              style={{
                background: "oklch(0.55 0.22 145 / 0.15)",
                border: "2px solid oklch(0.55 0.22 145 / 0.4)",
                color: "oklch(0.85 0.28 130)",
                boxShadow: revealed
                  ? "0 0 30px oklch(0.55 0.22 145 / 0.5), 0 0 60px oklch(0.55 0.22 145 / 0.25)"
                  : "none",
                transition: "box-shadow 0.4s ease",
              }}
            >
              {getBadgeIcon(badge.criteria)}
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">{badge.name}</h3>
              <p className="text-sm text-white/60 max-w-xs">
                {badge.description}
              </p>
            </div>
          </div>
        )}

        {/* Tap to skip hint */}
        <p className="text-xs text-white/30 mt-2">Tap anywhere to skip</p>
      </div>
    </div>
  );
}
