import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useGetCallerUserProfile } from '../../hooks/useCurrentUserProfile';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { User, LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export default function TopBar() {
  const { clear, identity } = useInternetIdentity();
  const { data: userProfile } = useGetCallerUserProfile();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  return (
    <header className="border-b bg-card">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/assets/generated/app-logo.dim_512x512.png" alt="Logo" className="h-10 w-10" />
          <h1 className="text-xl font-bold">Pickleball Scheduler</h1>
        </div>
        
        {identity && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  {userProfile?.name || 'User'}
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
  );
}
