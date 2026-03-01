import { AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function ErrorState({ 
  title = 'Error', 
  message, 
  onRetry,
  secondaryAction,
}: ErrorStateProps) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>{message}</p>
        <div className="flex gap-2">
          {onRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              className="mt-2"
            >
              Try Again
            </Button>
          )}
          {secondaryAction && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={secondaryAction.onClick}
              className="mt-2"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
