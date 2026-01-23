import React from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  historyError: string;
  onRetry: () => void;
};

export function ErrorBoundary({ historyError, onRetry }: Props) {
  // Ensure we always render a plain string, never [object Object]
  const normalize = (msg: string) => {
    const trimmed = msg.trim();
    if (!trimmed || trimmed === '[object Object]') {
      return 'Unknown error (no details). Please check console.';
    }
    return trimmed;
  };

  const safeMessage =
    typeof historyError === 'string' && historyError.trim()
      ? normalize(historyError)
      : 'Unknown error (no details). Please check console.';

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
