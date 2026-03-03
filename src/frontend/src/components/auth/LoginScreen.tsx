import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import AppLogo from "../branding/AppLogo";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

export default function LoginScreen() {
  const { login, loginStatus } = useInternetIdentity();

  const isLoggingIn = loginStatus === "logging-in";

  return (
    <div
      className="relative flex min-h-screen items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage:
          "url(https://blob.caffeine.ai/v1/blob/?blob_hash=sha256%3Ac922d63f8271822d4f882642444f8f2bdb0d1941683fa577854ba343e6b0ce7d&owner_id=bjzp7-xyaaa-aaaaf-qbsta-cai&project_id=0198d89b-d4eb-711d-abfd-9b50202a1152)",
      }}
    >
      {/* Overlay for better card readability */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Card content */}
      <Card className="relative z-10 w-full max-w-md backdrop-blur-sm bg-background/95 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <AppLogo className="h-24 w-24" />
          </div>
          <CardTitle className="text-2xl">
            Welcome to Somers Scheduler
          </CardTitle>
          <CardDescription>
            Sign in to view the shared calendar, chat with friends, and track
            your stats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={login}
            disabled={isLoggingIn}
            className="w-full"
            size="lg"
          >
            {isLoggingIn ? "Signing in..." : "Sign In"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
