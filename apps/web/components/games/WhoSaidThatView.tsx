'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { EyeOff, Flag, Send, ShieldAlert, Sparkles } from 'lucide-react';
import {
  AVATAR_PRESETS,
  CONTENT_CATEGORIES,
  type ContentCategory,
  type RoomState,
  type WhoSaidThatState,
} from '@chaos/shared';
import { getChaosSocket } from '@/lib/socket';
import { chaosSound } from '@/lib/sound';
import { AvatarBadge } from '../shared/AvatarBadge';
import { CountdownTimer } from '@/components/shared/CountdownTimer';

const BALL_COLORS = ['#3478F6', '#16A36A', '#5BB7F5', '#10B981', '#F2A93B', '#16B8A6'];

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
  const maxMsgs = state.messagesPerPlayer ?? 2;
  const isSpotlightPlayer =
    state.mode === 'spotlight' && state.spotlightPlayerId === playerId;
  const spotlightPlayer = room.players.find((p) => p.id === state.spotlightPlayerId);

  const [text, setText] = useState('');
  const [category, setCategory] = useState<ContentCategory>('funny');
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [localCount, setLocalCount] = useState(0);
  const [animIdx, setAnimIdx] = useState(0);

  useEffect(() => {
    if (state.phase === 'submitting' && state.submissionsReceivedCount === 0) {
      setLocalCount(0);
    }
  }, [state.phase, state.submissionsReceivedCount]);

  // Spotlight random assignment animation ticker
  useEffect(() => {
    if (state.phase !== 'selecting-spotlight' || room.players.length === 0) return;
    const id = setInterval(() => {
      setAnimIdx((prev) => (prev + 1) % room.players.length);
      chaosSound.click();
    }, 200);
    return () => clearInterval(id);
  }, [state.phase, room.players.length]);

  useEffect(() => {
    if (state.phase === 'submitting' && state.mode === 'spotlight') {
      chaosSound.crown();
    }
    if (state.phase === 'reveal') {
      chaosSound.reveal();
    }
  }, [state.phase, state.mode]);

  const myCount = Math.max(state.mySubmissionCount, localCount);
  const hasGuessed = state.guessedPlayerIds.includes(playerId);

  const submitConfession = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    socket.emit('game:submit', { text, category }, (res) => {
      if (res?.ok) {
        setText('');
        setLocalCount((c) => Math.min(maxMsgs, c + 1));
        chaosSound.chime();
      } else {
        if (res?.error?.includes('maximum')) {
          setLocalCount(maxMsgs);
        }
        setError(res?.error || 'Could not submit.');
      }
    });
  };

  const submitGuess = (targetPlayerId: string) => {
    socket.emit('game:vote', { targetPlayerId }, (res) => {
      if (res?.ok) {
        chaosSound.click();
      } else {
        setError(res?.error || 'Could not submit guess.');
      }
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

  const candidate = room.players[animIdx % Math.max(1, room.players.length)];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="chaos-card p-6 sm:p-8 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-chaos-blue-soft dark:bg-chaos-dark-elevated text-chaos-blue dark:text-chaos-dark-blue">
            <EyeOff className="w-3.5 h-3.5" /> Who Said That?
          </span>
          {state.mode === 'spotlight' && (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-chaos-green-soft dark:bg-chaos-dark-elevated text-chaos-green dark:text-chaos-dark-green">
              <Sparkles className="w-3 h-3" /> Spotlight
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-chaos-text-secondary">
          {state.phase === 'selecting-spotlight'
            ? 'Picking Spotlight...'
            : state.phase === 'submitting'
              ? `${state.submissionsReceivedCount} collected`
              : `Statement ${state.currentStatementIndex + 1} of ${state.totalStatements}`}
        </span>
      </div>

      {/* PHASE 0: Spotlight Random Assignment Animation */}
      {state.phase === 'selecting-spotlight' && (
        <div className="text-center py-8 space-y-6">
          <p className="text-xs font-extrabold uppercase tracking-widest text-chaos-green animate-pulse">
            Randomly Selecting the Spotlight Player...
          </p>

          {candidate && (
            <motion.div
              key={candidate.id}
              initial={{ scale: 0.9, opacity: 0.7 }}
              animate={{ scale: 1.05, opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="max-w-xs mx-auto p-6 rounded-card chaos-gradient text-white shadow-glow space-y-3"
            >
              <Sparkles className="w-8 h-8 mx-auto animate-spin" />
              <div className="flex justify-center">
                <AvatarBadge avatarId={candidate.avatarId} size="lg" />
              </div>
              <p className="text-2xl font-extrabold">{candidate.nickname}</p>
            </motion.div>
          )}

          {isHost && (
            <button
              type="button"
              onClick={() => socket.emit('game:action', { action: 'skip-spotlight-anim' })}
              className="chaos-btn-secondary text-xs"
            >
              Skip Animation
            </button>
          )}
        </div>
      )}

      {/* Spotlight Banner */}
      {state.mode === 'spotlight' &&
        spotlightPlayer &&
        state.phase !== 'selecting-spotlight' && (
          <div className="p-4 rounded-card chaos-gradient text-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AvatarBadge avatarId={spotlightPlayer.avatarId} size="sm" />
              <div>
                <p className="text-[11px] uppercase tracking-wider opacity-90 font-bold">
                  In the Spotlight
                </p>
                <p className="font-extrabold text-base">
                  {spotlightPlayer.nickname} {isSpotlightPlayer ? '(You!)' : ''}
                </p>
              </div>
            </div>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">
              Everyone else writes!
            </span>
          </div>
        )}

      {/* PHASE 1: Anonymous Submission */}
      {state.phase === 'submitting' && (
        <div className="space-y-5">
          <CountdownTimer endsAt={state.endsAt} totalSeconds={room.settings.timerSeconds || 45} />

          <div className="p-3.5 rounded-btn bg-chaos-green-soft/70 dark:bg-chaos-dark-elevated text-xs text-chaos-text-secondary flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-chaos-green shrink-0 mt-0.5" />
            <span>
              Your identity is hidden from other players in this room. Submissions are shuffled
              before voting so order never reveals who wrote what.
            </span>
          </div>

          {isSpotlightPlayer ? (
            <div className="text-center py-8 space-y-2 bg-chaos-bg dark:bg-chaos-dark-elevated rounded-card p-6">
              <Sparkles className="w-8 h-8 text-chaos-green mx-auto animate-pulse" />
              <h3 className="text-lg font-bold">You are in the Spotlight!</h3>
              <p className="text-sm text-chaos-text-secondary max-w-md mx-auto">
                Other players are writing anonymous messages for you. Once they finish, you&apos;ll
                read them and vote on who wrote each one!
              </p>
            </div>
          ) : myCount < maxMsgs ? (
            <form onSubmit={submitConfession} className="space-y-3">
              <textarea
                required
                minLength={4}
                maxLength={280}
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  state.mode === 'spotlight' && spotlightPlayer
                    ? `Write an anonymous message for ${spotlightPlayer.nickname}...`
                    : 'Write an anonymous confession, funny opinion, or compliment...'
                }
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
                  <span>
                    Submit Anonymously ({myCount}/{maxMsgs})
                  </span>
                </button>
              </div>
            </form>
          ) : (
            <p className="text-center font-semibold text-chaos-green py-4">
              You&apos;ve submitted your {maxMsgs} anonymous statement{maxMsgs > 1 ? 's' : ''}!
              Waiting for the host to start guessing.
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

      {/* PHASE 2 & 3: Guessing & Reveal with Live Voting Balls */}
      {(state.phase === 'guessing' || state.phase === 'reveal') && state.currentStatement && (
        <div className="space-y-5">
          {state.phase === 'guessing' && (
            <CountdownTimer
              endsAt={state.endsAt}
              totalSeconds={room.settings.timerSeconds || 45}
            />
          )}

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

          {state.phase === 'reveal' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-4 rounded-btn bg-chaos-green-soft dark:bg-chaos-dark-elevated text-center"
            >
              {state.currentStatement.authorName ? (
                <>
                  <p className="text-xs uppercase font-bold text-chaos-green">Written by</p>
                  <p className="text-2xl font-extrabold">{state.currentStatement.authorName}</p>
                </>
              ) : (
                <p className="text-sm font-semibold text-chaos-text-secondary">
                  Author identities are kept secret in this room!
                </p>
              )}
            </motion.div>
          )}

          {/* Live Voting Balls + Who Voted Whom */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-chaos-text-secondary">
              <span>
                {state.phase === 'guessing'
                  ? hasGuessed
                    ? 'Vote locked! Watching live votes...'
                    : 'Tap a player to cast your voting ball (even writers can bluff!):'
                  : 'Final Vote Breakdown:'}
              </span>
              <span>
                {state.guessesCount}/{room.players.length} voted
              </span>
            </div>

            <div className="space-y-2.5">
              {room.players.map((p) => {
                const voters = state.liveVotes?.[p.id] ?? [];
                const voteCount = state.voteDistribution[p.id] ?? voters.length;
                const pct =
                  room.players.length > 0
                    ? Math.round((voteCount / room.players.length) * 100)
                    : 0;
                const isAuthor =
                  state.phase === 'reveal' && state.currentStatement?.authorId === p.id;

                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={state.phase !== 'guessing' || hasGuessed}
                    onClick={() => submitGuess(p.id)}
                    className={`w-full p-3.5 rounded-btn border text-left transition-all space-y-2.5 ${
                      isAuthor
                        ? 'border-chaos-green bg-chaos-green-soft/60 dark:bg-chaos-dark-elevated'
                        : 'border-chaos-border dark:border-chaos-dark-border hover:border-chaos-blue disabled:hover:border-chaos-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AvatarBadge avatarId={p.avatarId} size="sm" />
                        <span className="font-bold text-sm truncate">
                          {p.nickname}
                          {isAuthor && (
                            <span className="ml-2 text-xs text-chaos-green font-extrabold">
                              ✓ Author
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Tactile Voting Balls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {voters.map((voterId, idx) => {
                          const voter = room.players.find((pl) => pl.id === voterId);
                          const preset = AVATAR_PRESETS.find((a) => a.id === voter?.avatarId);
                          return (
                            <motion.span
                              key={voterId}
                              initial={{ scale: 0, y: -6 }}
                              animate={{ scale: 1, y: 0 }}
                              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                              title={`Voted by ${voter?.nickname ?? 'Player'}`}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-sm border-2 border-white dark:border-chaos-dark-surface"
                              style={{
                                backgroundColor: BALL_COLORS[idx % BALL_COLORS.length],
                              }}
                            >
                              {preset?.emoji ?? '●'}
                            </motion.span>
                          );
                        })}
                        <span className="text-xs font-extrabold text-chaos-blue dark:text-chaos-dark-blue ml-1">
                          {voteCount}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full rounded-full bg-chaos-bg dark:bg-chaos-dark-bg overflow-hidden">
                      <div
                        className="h-full chaos-gradient transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Who Voted Whom Chips */}
                    {voters.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {voters.map((voterId) => {
                          const voter = room.players.find((pl) => pl.id === voterId);
                          return (
                            <span
                              key={voterId}
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-chaos-bg dark:bg-chaos-dark-surface text-chaos-text-secondary"
                            >
                              {voter?.nickname ?? 'Player'} voted
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {isHost && state.phase === 'guessing' && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => socket.emit('game:action', { action: 'reveal-answer' })}
                  className="chaos-btn-primary"
                >
                  Reveal Author
                </button>
              </div>
            )}

            {isHost && state.phase === 'reveal' && (
              <div className="pt-2 flex justify-end">
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
        </div>
      )}
    </motion.div>
  );
}
