import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useCurrentUserProfile';
import { useInitializeCallerLeaderboard } from './hooks/useQueries';
import { useActor } from './hooks/useActor';
import LoginScreen from './components/auth/LoginScreen';
import ProfileSetupModal from './components/profile/ProfileSetupModal';
import AppLayout from './components/layout/AppLayout';
import CalendarMonthPage from './pages/CalendarMonthPage';
import DayDetailPage from './pages/DayDetailPage';
import AddAvailabilityPage from './pages/AddAvailabilityPage';
import ChatPage from './pages/ChatPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import Background from './components/theme/Background';
import { Toaster } from './components/ui/sonner';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const { mutate: initializeLeaderboard } = useInitializeCallerLeaderboard();
  const hasInitialized = useRef(false);

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
    }
  }, [isAuthenticated]);

  if (isInitializing || actorFetching || (isAuthenticated && profileLoading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

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
      <Toaster />
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
