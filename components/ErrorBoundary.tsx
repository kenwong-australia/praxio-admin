import React from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  historyError: string;
  onRetry: () => void;
};

export function ErrorBoundary({ historyError, onRetry }: Props) {
  // Ensure we always render a plain string, never [object Object]
  const safeMessage =
    typeof historyError === 'string' && historyError.trim()
      ? historyError
      : 'An unknown error occurred. Please check console for details.';

  return (
    <div className="py-6 text-center text-sm text-red-600">
      {safeMessage}
      <div className="mt-3">
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}
