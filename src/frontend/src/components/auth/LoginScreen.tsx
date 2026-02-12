import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export default function LoginScreen() {
  const { login, loginStatus } = useInternetIdentity();

  const isLoggingIn = loginStatus === 'logging-in';

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <img src="/assets/generated/app-logo.dim_512x512.png" alt="Pickleball App" className="h-24 w-24" />
          </div>
          <CardTitle className="text-2xl">Welcome to Pickleball Scheduler</CardTitle>
          <CardDescription>
            Sign in to view the shared calendar, chat with friends, and track your stats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={login}
            disabled={isLoggingIn}
            className="w-full"
            size="lg"
          >
            {isLoggingIn ? 'Signing in...' : 'Sign In'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
