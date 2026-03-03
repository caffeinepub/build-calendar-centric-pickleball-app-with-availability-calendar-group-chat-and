import { useQueryClient } from "@tanstack/react-query";
import { Download, LogOut, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useGetCallerUserProfile } from "../../hooks/useCurrentUserProfile";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { usePWAInstallPrompt } from "../../hooks/usePWAInstallPrompt";
import { useTheme } from "../../hooks/useTheme";
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

export default function TopBar() {
  const { clear, identity } = useInternetIdentity();
  const { data: userProfile } = useGetCallerUserProfile();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const { isInstallAvailable, isStandalone, isIOS, canPrompt, promptInstall } =
    usePWAInstallPrompt();
  const [showInstructions, setShowInstructions] = useState(false);

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

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>

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
