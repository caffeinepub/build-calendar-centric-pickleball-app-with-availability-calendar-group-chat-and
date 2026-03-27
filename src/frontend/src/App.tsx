import { useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import LoginScreen from "./components/auth/LoginScreen";
import BadgeUnlockAnimation from "./components/badges/BadgeUnlockAnimation";
import { ErrorState } from "./components/common/ErrorState";
import { FullPageLoading } from "./components/common/LoadingState";
import AppLayout from "./components/layout/AppLayout";
import ProfileSetupModal from "./components/profile/ProfileSetupModal";
import Background from "./components/theme/Background";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { useActor } from "./hooks/useActor";
import { useBadgeUnlockWatcher } from "./hooks/useBadgeUnlockWatcher";
import { useGetCallerUserProfile } from "./hooks/useCurrentUserProfile";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useGetCallerStats,
  useGetWeatherZipCode,
  useInitializeCallerLeaderboard,
} from "./hooks/useQueries";
import AddAvailabilityPage from "./pages/AddAvailabilityPage";
import AdminPage from "./pages/AdminPage";
import CalendarMonthPage from "./pages/CalendarMonthPage";
import ChatPage from "./pages/ChatPage";
import DayDetailPage from "./pages/DayDetailPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import { setWeatherZip } from "./services/weatherService";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { identity, isInitializing, clear } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
    error: profileError,
    refetch: refetchProfile,
  } = useGetCallerUserProfile();
  const { mutate: initializeLeaderboard } = useInitializeCallerLeaderboard();
  const queryClient = useQueryClient();
  const hasInitialized = useRef(false);
  const { data: weatherZip } = useGetWeatherZipCode();

  const isAuthenticated = !!identity;

  // Sync weather zip code from backend to weatherService
  // biome-ignore lint/correctness/useExhaustiveDependencies: weatherZip is the only dep
  useEffect(() => {
    if (weatherZip) {
      setWeatherZip(weatherZip);
    }
  }, [weatherZip]);

  // Initialize leaderboard stats and record login time after successful login and actor readiness
  useEffect(() => {
    if (isAuthenticated && actor && !actorFetching && !hasInitialized.current) {
      hasInitialized.current = true;
      initializeLeaderboard();
    }
  }, [isAuthenticated, actor, actorFetching, initializeLeaderboard]);

  // Reset initialization flag on logout
  useEffect(() => {
    if (!isAuthenticated) {
      hasInitialized.current = false;
    }
  }, [isAuthenticated]);

  // Handle logout with cache clearing
  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    hasInitialized.current = false;
  };

  // Show loading only while there is active progress
  const isLoading =
    isInitializing ||
    (isAuthenticated && actorFetching) ||
    (isAuthenticated && actor && profileLoading && !profileError);

  if (isLoading) {
    return <FullPageLoading message="Loading your account..." />;
  }

  // Show error state if profile fetch failed (actor errors are harder to detect without error property)
  if (isAuthenticated && actor && profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <ErrorState
            title="Connection Error"
            message="Failed to load your profile. Please try again."
            onRetry={() => refetchProfile()}
          />
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={handleLogout}>
              Log Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated but no actor after loading, show error
  if (isAuthenticated && !actorFetching && !actor) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <ErrorState
            title="Connection Error"
            message="Failed to initialize your session. Please try logging in again."
            onRetry={() => window.location.reload()}
          />
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={handleLogout}>
              Log Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const showProfileSetup =
    isAuthenticated && !profileLoading && isFetched && userProfile === null;

  return (
    <>
      {children}
      {showProfileSetup && <ProfileSetupModal />}
    </>
  );
}

function BadgeWatcher() {
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal() ?? null;
  const { data: callerStats } = useGetCallerStats();
  const { pendingBadge, dismissBadge } = useBadgeUnlockWatcher(principal);

  if (!pendingBadge) return null;

  return (
    <BadgeUnlockAnimation
      badge={pendingBadge}
      currentStreak={Number(callerStats?.streak ?? 0n)}
      onDismiss={dismissBadge}
    />
  );
}

function Layout() {
  return (
    <Background>
      <AppLayout>
        <Outlet />
      </AppLayout>
      <Toaster />
      <BadgeWatcher />
    </Background>
  );
}

const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: CalendarMonthPage,
});

const dayDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/day/$date",
  component: DayDetailPage,
});

const addAvailabilityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/add-availability",
  component: AddAvailabilityPage,
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat",
  component: ChatPage,
});

const leaderboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/leaderboard",
  component: LeaderboardPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dayDetailRoute,
  addAvailabilityRoute,
  chatRoute,
  leaderboardRoute,
  profileRoute,
  adminRoute,
]);

const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <AuthGate>
      <RouterProvider router={router} />
    </AuthGate>
  );
}
