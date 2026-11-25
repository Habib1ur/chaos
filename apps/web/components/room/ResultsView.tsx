'use client';

import { useEffect, useState } from 'react';
import { Check, RotateCcw, Share2, Trophy } from 'lucide-react';
import type { GameResultSummary } from '@chaos/shared';
import { getChaosSocket } from '@/lib/socket';
import { chaosSound } from '@/lib/sound';
import { AvatarBadge } from '../shared/AvatarBadge';

export function ResultsView({
  results,
  isHost,
}: {
  results: GameResultSummary;
  isHost: boolean;
}) {
  const socket = getChaosSocket();
  const [shared, setShared] = useState(false);

  useEffect(() => {
    chaosSound.victory();
  }, []);

  const shareSummary = async () => {
    const lines = [
      `🎉 CHAOS — ${results.gameName} Results`,
      ...results.rankings.map(
        (r) => `#${r.rank} ${r.nickname} — ${r.score} pts${r.badge ? ` (${r.badge})` : ''}`
      ),
      'Play together on CHAOS!',
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
    setShared(true);
    setTimeout(() => setShared(false), 2200);
  };

  return (
    <div className="chaos-card p-6 sm:p-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl chaos-gradient text-white mx-auto flex items-center justify-center shadow-glow">
          <Trophy className="w-7 h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold">{results.gameName} Results</h2>
        <p className="text-sm text-chaos-text-secondary">
          Session complete! Check out the final standings.
        </p>
      </div>

      <div className="space-y-2.5">
        {results.rankings.map((r) => (
          <div
            key={r.playerId}
            className={`p-3.5 rounded-btn border flex items-center justify-between gap-3 ${
              r.rank === 1
                ? 'border-chaos-green bg-chaos-green-soft/60 dark:bg-chaos-dark-elevated'
                : 'border-chaos-border dark:border-chaos-dark-border'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-lg w-6 text-center">#{r.rank}</span>
              <AvatarBadge avatarId={r.avatarId} size="sm" />
              <div>
                <p className="font-bold text-sm sm:text-base">{r.nickname}</p>
                {r.badge && (
                  <span className="text-xs font-semibold text-chaos-green dark:text-chaos-dark-green">
                    🏅 {r.badge}
                  </span>
                )}
              </div>
            </div>
            <span className="font-extrabold text-lg text-chaos-blue dark:text-chaos-dark-blue">
              {r.score} pts
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button type="button" onClick={shareSummary} className="chaos-btn-secondary">
          {shared ? <Check className="w-4 h-4 text-chaos-green" /> : <Share2 className="w-4 h-4" />}
          <span>{shared ? 'Copied Results!' : 'Share Results'}</span>
        </button>

        {isHost ? (
          <>
            <button
              type="button"
              onClick={() => socket.emit('game:start')}
              className="chaos-btn-primary flex-1"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>
            <button
              type="button"
              onClick={() => socket.emit('game:return-lobby')}
              className="chaos-btn-secondary flex-1"
            >
              <span>Switch Game / Lobby</span>
            </button>
          </>
        ) : (
          <p className="text-center text-sm text-chaos-text-secondary flex-1 self-center">
            Waiting for the host to start another round...
          </p>
        )}
      </div>
    </div>
  );
}
