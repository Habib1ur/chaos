'use client';

export default function GlobalAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-md mx-auto p-10 text-center space-y-4">
      <div className="chaos-card p-8 space-y-4">
        <h2 className="text-2xl font-extrabold">Something went wrong</h2>
        <p className="text-sm text-chaos-text-secondary">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button type="button" onClick={reset} className="chaos-btn-primary">
          Try Again
        </button>
      </div>
    </div>
  );
}
