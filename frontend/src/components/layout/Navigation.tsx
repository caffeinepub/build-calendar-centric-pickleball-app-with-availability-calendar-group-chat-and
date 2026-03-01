import { Link, useRouterState } from '@tanstack/react-router';
import { Calendar, Trophy, User, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { useIsCallerAdmin } from '../../hooks/useCurrentUserRole';

export default function Navigation() {
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const { data: isAdmin } = useIsCallerAdmin();

  const navItems = [
    { path: '/', label: 'Calendar', icon: Calendar },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  if (isAdmin) {
    navItems.push({ path: '/admin', label: 'Admin', icon: Shield });
  }

  return (
    <nav className="border-b bg-card safe-area-sides">
      <div className="container">
        <div className="flex gap-1 overflow-x-auto py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2 whitespace-nowrap"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
