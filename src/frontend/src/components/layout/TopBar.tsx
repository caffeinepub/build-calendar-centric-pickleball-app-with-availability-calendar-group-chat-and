import { useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Bell,
  Calendar,
  Check,
  Download,
  LogOut,
  MessageSquare,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import type { Notification } from "../../backend";
import { NotificationCategory } from "../../backend";
import { useGetCallerUserProfile } from "../../hooks/useCurrentUserProfile";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { usePWAInstallPrompt } from "../../hooks/usePWAInstallPrompt";
import {
  useGetMyNotifications,
  useGetUnreadNotificationCount,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "../../hooks/useQueries";
import { getInitials } from "../../utils/file";
import AppLogo from "../branding/AppLogo";
import InstallInstructionsDialog from "../pwa/InstallInstructionsDialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRelativeTime(timestampNs: bigint): string {
  const ms = Number(timestampNs / 1_000_000n);
  const diffMs = Date.now() - ms;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  const d = new Date(ms);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getCategoryIcon(category: NotificationCategory) {
  switch (category) {
    case NotificationCategory.mention:
      return <Bell className="h-4 w-4" />;
    case NotificationCategory.reply:
      return <MessageSquare className="h-4 w-4" />;
    case NotificationCategory.badgeUnlock:
      return <Award className="h-4 w-4" />;
    case NotificationCategory.rankChange:
      // We can't know direction here without oldRank/newRank at icon level,
      // so use TrendingUp as default; individual item handles it
      return <TrendingUp className="h-4 w-4" />;
    case NotificationCategory.availabilityOverlap:
      return <Calendar className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function getRankChangeIcon(notif: Notification) {
  if (
    notif.category === NotificationCategory.rankChange &&
    notif.newRank !== undefined &&
    notif.oldRank !== undefined
  ) {
    return notif.newRank < notif.oldRank ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-400" />
    );
  }
  return getCategoryIcon(notif.category);
}

// ─── NotificationItem ─────────────────────────────────────────────────────────

interface NotificationItemProps {
  notif: Notification;
  index: number;
  onRead: (id: bigint) => void;
}

function NotificationItem({ notif, index, onRead }: NotificationItemProps) {
  return (
    <button
      type="button"
      className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/60 border-b border-border/50 last:border-0 ${
        notif.read ? "opacity-70" : "bg-primary/5"
      }`}
      onClick={() => {
        if (!notif.read) onRead(notif.id);
      }}
      data-ocid={`topbar.notification.item.${index}`}
    >
      <span
        className={`mt-0.5 flex-shrink-0 ${notif.read ? "text-muted-foreground" : "text-primary"}`}
      >
        {getRankChangeIcon(notif)}
      </span>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm leading-snug line-clamp-2">{notif.message}</p>
        <p className="text-xs text-muted-foreground">
          {getRelativeTime(notif.timestamp)}
        </p>
      </div>
      {!notif.read && (
        <span className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
      )}
    </button>
  );
}

// ─── NotificationPanel ────────────────────────────────────────────────────────

function NotificationPanel() {
  const { data: notifications = [], isLoading } = useGetMyNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead, isPending: isMarkingAll } =
    useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col" data-ocid="topbar.notifications.popover">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm">Notifications</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-primary hover:text-primary/80 px-2"
            onClick={() => markAllRead()}
            disabled={isMarkingAll}
            data-ocid="topbar.notifications.mark_all_read.button"
          >
            <Check className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="h-[380px]">
        {isLoading ? (
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-3 border-b border-border/50"
              >
                <Skeleton className="h-4 w-4 mt-0.5 flex-shrink-0 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <Check className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">You're all caught up</p>
            <p className="text-xs text-muted-foreground mt-1">
              No new notifications
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((notif, index) => (
              <NotificationItem
                key={notif.id.toString()}
                notif={notif}
                index={index + 1}
                onRead={(id) => markRead(id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export default function TopBar() {
  const { clear, identity } = useInternetIdentity();
  const { data: userProfile } = useGetCallerUserProfile();
  const queryClient = useQueryClient();
  const { isInstallAvailable, isStandalone, isIOS, canPrompt, promptInstall } =
    usePWAInstallPrompt();
  const [showInstructions, setShowInstructions] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: unreadCount = 0n } = useGetUnreadNotificationCount();
  const unreadNum = Number(unreadCount);
  const badgeLabel =
    unreadNum > 99 ? "99+" : unreadNum > 0 ? String(unreadNum) : null;

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const handleInstallClick = async () => {
    if (canPrompt) {
      await promptInstall();
    } else {
      setShowInstructions(true);
    }
  };

  const displayName = userProfile?.name || "User";
  const avatarUrl = userProfile?.customProfilePicture?.getDirectURL();
  const initials = userProfile?.name ? getInitials(userProfile.name) : "U";

  return (
    <>
      <header className="border-b bg-card safe-area-top">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <AppLogo className="h-10 w-10" />
            <h1 className="text-xl font-bold">Somers Scheduler</h1>
          </div>

          {identity && (
            <div className="flex items-center gap-2">
              {isInstallAvailable && !isStandalone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInstallClick}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Install
                </Button>
              )}

              {/* Bell notification button */}
              <Popover open={notifOpen} onOpenChange={setNotifOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Notifications"
                    className="relative"
                    data-ocid="topbar.notifications.button"
                  >
                    <Bell className="h-5 w-5" />
                    {badgeLabel && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none px-1 pointer-events-none">
                        {badgeLabel}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-[340px] sm:w-[380px] p-0 overflow-hidden"
                  sideOffset={8}
                >
                  <NotificationPanel />
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Avatar className="h-6 w-6">
                      {avatarUrl && (
                        <AvatarImage src={avatarUrl} alt={displayName} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {displayName}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </header>

      <InstallInstructionsDialog
        open={showInstructions}
        onOpenChange={setShowInstructions}
        isIOS={isIOS}
      />
    </>
  );
}
