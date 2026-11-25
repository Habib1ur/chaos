'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { EyeOff, Flag, Send, ShieldAlert } from 'lucide-react';
import { CONTENT_CATEGORIES, type ContentCategory, type RoomState, type WhoSaidThatState } from '@chaos/shared';
import { getChaosSocket } from '@/lib/socket';
import { AvatarBadge } from '../shared/AvatarBadge';
import { CountdownTimer } from '@/components/shared/CountdownTimer';

export function WhoSaidThatView({
  room,
  state,
  playerId,
}: {
  room: RoomState;
  state: WhoSaidThatState;
  playerId: string;
}) {
  const socket = getChaosSocket();
  const isHost = room.hostId === playerId;
  const [text, setText] = useState('');
  const [category, setCategory] = useState<ContentCategory>('funny');
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);

  const hasGuessed = state.guessedPlayerIds.includes(playerId);

  const submitConfession = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    socket.emit('game:submit', { text, category }, (res) => {
      if (res?.ok) {
        setText('');
      } else {
        setError(res?.error || 'Could not submit.');
      }
    });
  };

  const submitGuess = (targetPlayerId: string) => {
    socket.emit('game:vote', { targetPlayerId }, (res) => {
      if (!res?.ok) setError(res?.error || 'Could not submit guess.');
    });
  };

  const reportCurrent = () => {
    if (!state.currentStatement) return;
    socket.emit('submission:report', {
      targetType: 'submission',
      targetId: state.currentStatement.id,
      reason: 'Inappropriate anonymous submission',
    });
    setReported(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="chaos-card p-6 sm:p-8 space-y-6"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-chaos-blue-soft dark:bg-chaos-dark-elevated text-chaos-blue dark:text-chaos-dark-blue">
          <EyeOff className="w-3.5 h-3.5" /> Who Said That?
        </span>
        <span className="text-xs font-semibold text-chaos-text-secondary">
          {state.phase === 'submitting'
            ? `${state.submissionsReceivedCount} collected`
            : `Statement ${state.currentStatementIndex + 1} of ${state.totalStatements}`}
        </span>
      </div>

      {/* Phase 1: Anonymous Submission */}
      {state.phase === 'submitting' && (
        <div className="space-y-5">
          <div className="p-3.5 rounded-btn bg-chaos-green-soft/70 dark:bg-chaos-dark-elevated text-xs text-chaos-text-secondary flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-chaos-green shrink-0 mt-0.5" />
            <span>
              Your identity is hidden from other players in this room. Submissions are shuffled
              before voting so order never reveals who wrote what.
            </span>
          </div>

          {state.mySubmissionCount < 2 ? (
            <form onSubmit={submitConfession} className="space-y-3">
              <textarea
                required
                minLength={4}
                maxLength={280}
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write an anonymous confession, funny opinion, or compliment..."
                className="w-full p-3.5 rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent focus:outline-none focus:ring-2 focus:ring-chaos-blue"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ContentCategory)}
                  className="px-3 py-2 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-chaos-surface dark:bg-chaos-dark-elevated text-sm capitalize"
                >
                  {CONTENT_CATEGORIES.slice(0, 7).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button type="submit" className="chaos-btn-primary">
                  <Send className="w-4 h-4" />
                  <span>Submit Anonymously ({state.mySubmissionCount}/2)</span>
                </button>
              </div>
            </form>
          ) : (
            <p className="text-center font-semibold text-chaos-green py-4">
              You&apos;ve submitted your 2 anonymous statements! Waiting for the host to start guessing.
            </p>
          )}

          {error && <p className="text-sm text-chaos-danger">{error}</p>}

          {isHost && (
            <div className="pt-3 border-t border-chaos-border dark:border-chaos-dark-border flex justify-end">
              <button
                type="button"
                disabled={state.submissionsReceivedCount === 0}
                onClick={() => socket.emit('game:action', { action: 'start-guessing' })}
                className="chaos-btn-primary"
              >
                Shuffle &amp; Start Guessing ({state.submissionsReceivedCount})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Phase 2 & 3: Guessing & Reveal */}
      {(state.phase === 'guessing' || state.phase === 'reveal') && state.currentStatement && (
        <div className="space-y-5">
          <div className="p-6 rounded-card bg-chaos-bg dark:bg-chaos-dark-elevated border border-chaos-border dark:border-chaos-dark-border text-center space-y-2 relative">
            <span className="text-xs uppercase font-bold tracking-wider text-chaos-text-muted">
              {state.currentStatement.category}
            </span>
            <p className="text-xl sm:text-2xl font-bold">&ldquo;{state.currentStatement.text}&rdquo;</p>
            <button
              type="button"
              onClick={reportCurrent}
              disabled={reported}
              className="text-xs text-chaos-text-muted hover:text-chaos-danger inline-flex items-center gap-1 pt-2"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{reported ? 'Reported' : 'Report'}</span>
            </button>
          </div>

          {state.phase === 'guessing' && (
            <div className="space-y-3">
              <CountdownTimer endsAt={state.endsAt} totalSeconds={room.settings.timerSeconds} />
              <p className="text-sm font-semibold text-center">
                {hasGuessed
                  ? `Guess locked! (${state.guessesCount}/${room.players.length} voted)`
                  : 'Who wrote this? Tap a player to guess:'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {room.players.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={hasGuessed}
                    onClick={() => submitGuess(p.id)}
                    className="p-3 rounded-btn border border-chaos-border dark:border-chaos-dark-border hover:border-chaos-blue flex items-center gap-2.5 text-left disabled:opacity-60"
                  >
                    <AvatarBadge avatarId={p.avatarId} size="sm" />
                    <span className="font-semibold text-sm truncate">{p.nickname}</span>
                  </button>
                ))}
              </div>

              {isHost && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => socket.emit('game:action', { action: 'reveal-answer' })}
                    className="chaos-btn-primary"
                  >
                    Reveal Votes &amp; Author
                  </button>
                </div>
              )}
            </div>
          )}

          {state.phase === 'reveal' && (
            <div className="space-y-4">
              {state.currentStatement.authorName ? (
                <div className="p-4 rounded-btn bg-chaos-green-soft dark:bg-chaos-dark-elevated text-center">
                  <p className="text-xs uppercase font-bold text-chaos-green">Written by</p>
                  <p className="text-2xl font-extrabold">{state.currentStatement.authorName}</p>
                </div>
              ) : (
                <p className="text-center text-sm font-semibold text-chaos-text-secondary">
                  Author identities are kept secret in this room!
                </p>
              )}

              <div className="space-y-2">
                {room.players.map((p) => {
                  const votes = state.voteDistribution[p.id] ?? 0;
                  return (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span>{p.nickname}</span>
                      <span className="font-bold text-chaos-blue">{votes} votes</span>
                    </div>
                  );
                })}
              </div>

              {isHost && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => socket.emit('game:action', { action: 'next-statement' })}
                    className="chaos-btn-primary"
                  >
                    {state.currentStatementIndex + 1 >= state.totalStatements
                      ? 'Finish Game'
                      : 'Next Statement →'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
