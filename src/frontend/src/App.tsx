import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useCurrentUserProfile';
import { useInitializeCallerLeaderboard } from './hooks/useQueries';
import { useActor } from './hooks/useActor';
import LoginScreen from './components/auth/LoginScreen';
import ProfileSetupModal from './components/profile/ProfileSetupModal';
import AuthGateErrorState from './components/auth/AuthGateErrorState';
import AppLayout from './components/layout/AppLayout';
import CalendarMonthPage from './pages/CalendarMonthPage';
import DayDetailPage from './pages/DayDetailPage';
import AddAvailabilityPage from './pages/AddAvailabilityPage';
import ChatPage from './pages/ChatPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import Background from './components/theme/Background';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const { data: userProfile, isLoading: profileLoading, isFetched, error: profileError } = useGetCallerUserProfile();
  const { mutate: initializeLeaderboard } = useInitializeCallerLeaderboard();
  const queryClient = useQueryClient();
  const hasInitialized = useRef(false);
  const [initTimeout, setInitTimeout] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthenticated = !!identity;

  // Initialize leaderboard stats after successful login and actor readiness
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
      setInitTimeout(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isAuthenticated]);

  // Set a timeout for initialization when authenticated
  useEffect(() => {
    if (isAuthenticated && !actor && !actorFetching) {
      // Start timeout only if we're authenticated but actor isn't ready
      timeoutRef.current = setTimeout(() => {
        setInitTimeout(true);
      }, 10000); // 10 second timeout
    } else if (actor || !isAuthenticated) {
      // Clear timeout if actor becomes ready or user logs out
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setInitTimeout(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isAuthenticated, actor, actorFetching]);

  const handleRetry = () => {
    setInitTimeout(false);
    queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    queryClient.invalidateQueries({ queryKey: ['callerStats'] });
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    hasInitialized.current = false;
  };

  const handleReload = () => {
    window.location.reload();
  };

  // Show error state if profile query failed or initialization timed out
  if (isAuthenticated && (profileError || initTimeout)) {
    return <AuthGateErrorState onRetry={handleRetry} onReload={handleReload} />;
  }

  // Only show loading during initial identity check or when actor is still initializing
  // Don't block on profile loading indefinitely
  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading only briefly while actor is fetching on initial auth
  if (isAuthenticated && actorFetching && !actor) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Connecting...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Only show profile setup modal if we've confirmed the profile is null
  // Don't block rendering while waiting for profile
  const showProfileSetup = isAuthenticated && isFetched && userProfile === null;

  return (
    <>
      {children}
      {showProfileSetup && <ProfileSetupModal />}
    </>
  );
}

function Layout() {
  return (
    <Background>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </Background>
  );
}

const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: CalendarMonthPage,
});

const dayDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/day/$date',
  component: DayDetailPage,
});

const addAvailabilityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/add-availability',
  component: AddAvailabilityPage,
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chat',
  component: ChatPage,
});

const leaderboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leaderboard',
  component: LeaderboardPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
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

const router = createRouter({ routeTree, defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
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
