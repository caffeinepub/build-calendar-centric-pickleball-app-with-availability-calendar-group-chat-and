import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AlertCircle } from 'lucide-react';

interface AuthGateErrorStateProps {
  onRetry: () => void;
  onReload: () => void;
}

export default function AuthGateErrorState({ onRetry, onReload }: AuthGateErrorStateProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-destructive">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">Initialization Failed</CardTitle>
          <CardDescription>
            We couldn't complete the initialization process. This might be due to a network issue or a temporary problem with the service.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={onRetry}
            className="w-full"
            size="lg"
          >
            Retry Initialization
          </Button>
          <Button
            onClick={onReload}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Reload Application
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
