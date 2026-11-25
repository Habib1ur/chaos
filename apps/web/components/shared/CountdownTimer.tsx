'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

export function CountdownTimer({
  endsAt,
  totalSeconds = 45,
}: {
  endsAt: number | null;
  totalSeconds?: number;
}) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!endsAt) {
      setRemaining(0);
      return;
    }
    const update = () => {
      const diff = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(diff);
    };
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;

  const pct = Math.min(100, Math.max(0, (remaining / totalSeconds) * 100));
  const isUrgent = remaining <= 10;

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between text-xs font-bold">
        <span
          className={`inline-flex items-center gap-1 ${
            isUrgent ? 'text-chaos-danger animate-pulse' : 'text-chaos-text-secondary'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{remaining}s left</span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-chaos-bg dark:bg-chaos-dark-bg overflow-hidden border border-chaos-border/60 dark:border-chaos-dark-border">
        <div
          className={`h-full transition-all duration-300 ${
            isUrgent ? 'bg-chaos-danger' : 'chaos-gradient'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
