'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Crown,
  Dices,
  Eye,
  Flame,
  Lock,
  SkipForward,
  Sparkles,
  Swords,
  Users,
} from 'lucide-react';
import type {
  KingsGameState,
  KingsMissionLevel,
  KingsPrivateState,
  RoomState,
} from '@chaos/shared';
import { getChaosSocket } from '@/lib/socket';
import { chaosSound } from '@/lib/sound';

const COUP_IDEAS = [
  'Do 10 jumping jacks while shouting "I am a humble peasant!" on every jump.',
  'Speak in a dramatic medieval royal accent for the next 2 rounds.',
  'Give every player in the room a dramatic royal knighting title.',
  'Sing the chorus of your favorite song like an opera star.',
];

const MISSION_IDEAS: Record<'truth' | 'dare', string[]> = {
  truth: [
    'What is the funniest white lie you have ever told a friend?',
    'Who in this room would survive the longest in a zombie apocalypse?',
    'What is a secret talent nobody here knows you have?',
    'What is the most embarrassing song on your playlist?',
  ],
  dare: [
    'Do your best 15-second impression of someone in this room.',
    'Speak like a movie trailer narrator until the next round.',
    'Send an emoji-only story in the room chat explaining your day.',
    'Give everyone in the room a hyper-specific compliment.',
  ],
};

const LEVELS: KingsMissionLevel[] = ['chill', 'funny', 'embarrassing', 'savage'];

export function KingsGameView({
  room,
  state,
  privateState,
  playerId,
}: {
  room: RoomState;
  state: KingsGameState;
  privateState: KingsPrivateState | null;
  playerId: string;
}) {
  const socket = getChaosSocket();
  const isHost = room.hostId === playerId;
  const isKing = state.kingPlayerId === playerId;

  // Coup Dare draft
  const [coupText, setCoupText] = useState('');
  const [coupError, setCoupError] = useState<string | null>(null);

  // King Decree drafts keyed by secret number
  const targetNumbers =
    privateState?.draftSlots?.map((s) => s.number) ??
    state.numberSlots.map((s) => s.number);

  const [drafts, setDrafts] = useState<
    Record<
      number,
      {
        type: 'truth' | 'dare';
        level: KingsMissionLevel;
        jointTargetNumber: number | null;
        isStarPick: boolean;
        text: string;
      }
    >
  >({});
  const [error, setError] = useState<string | null>(null);

  const updateDraft = (
    num: number,
    patch: Partial<{
      type: 'truth' | 'dare';
      level: KingsMissionLevel;
      jointTargetNumber: number | null;
      isStarPick: boolean;
      text: string;
    }>
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [num]: {
        type: prev[num]?.type ?? 'truth',
        level: prev[num]?.level ?? 'funny',
        jointTargetNumber: prev[num]?.jointTargetNumber ?? null,
        isStarPick: prev[num]?.isStarPick ?? false,
        text: prev[num]?.text ?? '',
        ...patch,
      },
    }));
  };

  const fillRandomCoupIdea = () => {
    const pick = COUP_IDEAS[Math.floor(Math.random() * COUP_IDEAS.length)];
    setCoupText(pick);
    chaosSound.click();
  };

  const fillRandomMissionIdea = (num: number, type: 'truth' | 'dare') => {
    const pool = MISSION_IDEAS[type];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    updateDraft(num, { text: pick });
    chaosSound.click();
  };

  const submitCoupDare = (e: React.FormEvent) => {
    e.preventDefault();
    setCoupError(null);
    socket.emit('game:submit', { text: coupText }, (res) => {
      if (!res?.ok) {
        setCoupError(res?.error || 'Could not seal dare.');
      } else {
        chaosSound.chime();
      }
    });
  };

  const submitAssignments = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const assignments = targetNumbers.map((num) => ({
      targetNumber: num,
      type: drafts[num]?.type ?? 'truth',
      level: drafts[num]?.level ?? 'funny',
      jointTargetNumber: drafts[num]?.jointTargetNumber ?? null,
      isStarPick: drafts[num]?.isStarPick ?? false,
      text: drafts[num]?.text ?? '',
    }));
    socket.emit('game:submit', { assignments }, (res) => {
      if (!res?.ok) {
        setError(res?.error || 'Could not submit assignments.');
      } else {
        chaosSound.crown();
      }
    });
  };

  const currentReveal = state.revealedAssignments[state.currentRevealIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="chaos-card p-6 sm:p-8 space-y-6"
    >
      {/* Header Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-chaos-blue-soft dark:bg-chaos-dark-elevated text-chaos-blue dark:text-chaos-dark-blue">
          Round {state.round} of {state.totalRounds}
        </span>

        {privateState && (
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-chaos-green-soft dark:bg-chaos-dark-elevated text-chaos-green dark:text-chaos-dark-green">
            Your Secret Number: #{privateState.myNumber}
          </span>
        )}
      </div>

      {/* PHASE 1: Coup Dares (Online Secret Chamber) */}
      {state.phase === 'coup-dares' && (
        <div className="space-y-5">
          <div className="p-5 rounded-card chaos-gradient text-white flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Swords className="w-8 h-8 shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-wider opacity-90 font-semibold">
                  Phase 1 • Secret Rebellion
                </p>
                <h2 className="text-xl sm:text-2xl font-extrabold">
                  Write a Secret Coup Dare for the King
                </h2>
              </div>
            </div>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold shrink-0">
              {state.coupDaresSubmittedPlayerIds.length} / {room.players.length} Sealed
            </span>
          </div>

          {privateState?.hasSubmittedCoupDare ||
          state.coupDaresSubmittedPlayerIds.includes(playerId) ? (
            <div className="text-center py-6 space-y-3">
              <Lock className="w-9 h-9 text-chaos-green mx-auto" />
              <h3 className="text-lg font-bold">Your Coup Dare is Sealed!</h3>
              <p className="text-sm text-chaos-text-secondary">
                Waiting for other players ({state.coupDaresSubmittedPlayerIds.length}/
                {room.players.length} ready). If someone becomes King, one of these dares will
                strike at the end of the round!
              </p>
              {isHost && (
                <button
                  type="button"
                  onClick={() => socket.emit('game:action', { action: 'start-king-selection' })}
                  className="chaos-btn-primary mt-2"
                >
                  <Crown className="w-4 h-4" />
                  <span>Crown the King Now →</span>
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={submitCoupDare} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">
                  Punishment Dare for whoever gets Crowned (leave blank for random)
                </label>
                <button
                  type="button"
                  onClick={fillRandomCoupIdea}
                  className="text-xs font-bold inline-flex items-center gap-1 px-3 py-1.5 rounded-btn border border-chaos-border dark:border-chaos-dark-border hover:border-chaos-blue"
                >
                  <Dices className="w-3.5 h-3.5 text-chaos-blue" />
                  <span>Idea</span>
                </button>
              </div>
              <textarea
                rows={3}
                maxLength={300}
                value={coupText}
                onChange={(e) => setCoupText(e.target.value)}
                placeholder="Write a hilarious punishment dare for the King (or leave blank for a surprise)..."
                className="w-full p-3.5 rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent focus:outline-none focus:ring-2 focus:ring-chaos-blue"
              />
              {coupError && <p className="text-sm text-chaos-danger">{coupError}</p>}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-chaos-text-muted">{coupText.length} / 300</span>
                <button type="submit" className="chaos-btn-primary">
                  <Lock className="w-4 h-4" />
                  <span>Seal Secret Dare</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* King Crown Banner (shown once King is chosen) */}
      {state.kingPlayerName && state.phase !== 'coup-dares' && (
        <div className="p-5 rounded-card chaos-gradient text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wider opacity-90 font-semibold">
                Crowned Secret King
              </p>
              <h2 className="text-2xl font-extrabold">
                {state.kingPlayerName} {isKing ? '(You!)' : ''}
              </h2>
            </div>
          </div>
          <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">
            {state.phase === 'revealing'
              ? 'The Great Reveal'
              : state.phase === 'king-twist'
                ? 'King Twist!'
                : 'Secret Decrees'}
          </span>
        </div>
      )}

      {/* PHASE 2 & 3: King Announced / Assigning */}
      {(state.phase === 'king-announced' || state.phase === 'king-assigning') && (
        <>
          {isKing ? (
            <form onSubmit={submitAssignments} className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-chaos-blue dark:text-chaos-dark-blue">
                <Lock className="w-4 h-4" />
                <span>
                  Private King Panel — Numbers are anonymous! You don&apos;t know which friend
                  holds which number.
                </span>
              </div>

              <div className="space-y-4">
                {targetNumbers.map((num) => {
                  const val = drafts[num] ?? {
                    type: 'truth' as const,
                    level: 'funny' as const,
                    jointTargetNumber: null,
                    isStarPick: false,
                    text: '',
                  };
                  const otherNumbers = targetNumbers.filter((n) => n !== num);

                  return (
                    <div
                      key={num}
                      className="p-4 rounded-btn border border-chaos-border dark:border-chaos-dark-border space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-extrabold text-sm">Subject #{num}</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => fillRandomMissionIdea(num, val.type)}
                            className="px-2.5 py-1 rounded-full text-xs font-bold border border-chaos-border dark:border-chaos-dark-border hover:border-chaos-blue inline-flex items-center gap-1"
                          >
                            <Dices className="w-3 h-3" /> Idea
                          </button>
                          <button
                            type="button"
                            onClick={() => updateDraft(num, { type: 'truth' })}
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              val.type === 'truth'
                                ? 'bg-chaos-blue text-white'
                                : 'border border-chaos-border dark:border-chaos-dark-border'
                            }`}
                          >
                            Truth
                          </button>
                          <button
                            type="button"
                            onClick={() => updateDraft(num, { type: 'dare' })}
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              val.type === 'dare'
                                ? 'bg-chaos-green text-white'
                                : 'border border-chaos-border dark:border-chaos-dark-border'
                            }`}
                          >
                            Dare
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        required
                        minLength={4}
                        maxLength={280}
                        value={val.text}
                        onChange={(e) => updateDraft(num, { text: e.target.value })}
                        placeholder={`Write a secret ${val.type} for Subject #${num}...`}
                        className="w-full px-3.5 py-2.5 rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent text-sm"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          {LEVELS.map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => updateDraft(num, { level: lvl })}
                              className={`px-2.5 py-1 rounded-full capitalize font-semibold ${
                                val.level === lvl
                                  ? 'bg-chaos-blue-soft text-chaos-blue dark:bg-chaos-dark-elevated dark:text-chaos-dark-blue'
                                  : 'text-chaos-text-muted'
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          {otherNumbers.length > 0 && (
                            <select
                              value={val.jointTargetNumber ?? ''}
                              onChange={(e) =>
                                updateDraft(num, {
                                  jointTargetNumber: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                              className="px-2.5 py-1 rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-chaos-surface dark:bg-chaos-dark-elevated text-xs"
                            >
                              <option value="">Solo Mission</option>
                              {otherNumbers.map((other) => (
                                <option key={other} value={other}>
                                  Joint with #{other}
                                </option>
                              ))}
                            </select>
                          )}

                          <button
                            type="button"
                            onClick={() => updateDraft(num, { isStarPick: !val.isStarPick })}
                            className={`px-2.5 py-1 rounded-full font-bold ${
                              val.isStarPick
                                ? 'bg-chaos-warning text-white'
                                : 'border border-chaos-border dark:border-chaos-dark-border text-chaos-text-muted'
                            }`}
                          >
                            ⭐ Star
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <p className="text-sm text-chaos-danger font-medium" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="chaos-btn-primary w-full">
                Seal &amp; Lock In All Decrees 👑
              </button>
            </form>
          ) : (
            <div className="text-center py-8 space-y-3">
              <Lock className="w-10 h-10 text-chaos-blue mx-auto animate-pulse" />
              <h3 className="text-xl font-bold">
                King {state.kingPlayerName} is writing secret decrees...
              </h3>
              <p className="text-sm text-chaos-text-secondary max-w-md mx-auto">
                Your secret number is <span className="font-bold">#{privateState?.myNumber}</span>.
                Even the King doesn&apos;t know who holds which number!
              </p>
            </div>
          )}
        </>
      )}

      {/* PHASE 4: The Great Reveal (Prompt-First -> Unmask -> Resolve) */}
      {state.phase === 'revealing' && currentReveal && (
        <div className="space-y-5 text-center py-2">
          <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-chaos-text-secondary">
            <span>
              The Great Reveal • Slot {state.currentRevealIndex + 1} of{' '}
              {state.totalAssignmentsNeeded}
            </span>
          </div>

          <div className="p-6 rounded-card bg-chaos-bg dark:bg-chaos-dark-elevated border border-chaos-border dark:border-chaos-dark-border space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-chaos-blue text-white">
                {currentReveal.unmasked
                  ? `Subject #${currentReveal.targetNumber} • ${currentReveal.targetPlayerName}`
                  : `Mystery Subject #${currentReveal.targetNumber}`}
              </span>

              {currentReveal.jointTargetNumber && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-chaos-green-soft text-chaos-green">
                  <Users className="w-3.5 h-3.5" />
                  {currentReveal.unmasked && currentReveal.jointTargetPlayerName
                    ? `Joint: #${currentReveal.jointTargetNumber} (${currentReveal.jointTargetPlayerName})`
                    : `Joint with #${currentReveal.jointTargetNumber}`}
                </span>
              )}

              {currentReveal.isStarPick && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-chaos-warning text-white">
                  ⭐ Star Pick
                </span>
              )}
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-chaos-green dark:text-chaos-dark-green">
              {currentReveal.type} • {currentReveal.level}
            </p>
            <p className="text-xl sm:text-2xl font-bold">{currentReveal.text}</p>
            <p className="text-xs text-chaos-text-muted capitalize">
              Status: {currentReveal.status}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {!currentReveal.unmasked && (isKing || isHost) && (
              <button
                type="button"
                onClick={() => {
                  chaosSound.reveal();
                  socket.emit('game:action', { action: 'unmask-current' });
                }}
                className="chaos-btn-primary"
              >
                <Eye className="w-4 h-4" />
                <span>Unmask Subject #{currentReveal.targetNumber}! 🎭</span>
              </button>
            )}

            {currentReveal.unmasked &&
              currentReveal.status === 'pending' &&
              (currentReveal.targetPlayerId === playerId ||
                currentReveal.jointTargetPlayerId === playerId ||
                isKing ||
                isHost) && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      chaosSound.chime();
                      socket.emit('game:action', {
                        action: 'resolve-assignment',
                        data: { outcome: 'completed' },
                      });
                    }}
                    className="chaos-btn-primary"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Completed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      chaosSound.victory();
                      socket.emit('game:action', {
                        action: 'resolve-assignment',
                        data: { outcome: 'creative' },
                      });
                    }}
                    className="chaos-btn-secondary"
                  >
                    <Sparkles className="w-4 h-4 text-chaos-warning" />
                    <span>Creative! (+20)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      socket.emit('game:action', {
                        action: 'resolve-assignment',
                        data: { outcome: 'skipped' },
                      })
                    }
                    className="chaos-btn-secondary"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>Skip</span>
                  </button>
                </>
              )}

            {currentReveal.unmasked && (isKing || isHost) && (
              <button
                type="button"
                onClick={() => socket.emit('game:action', { action: 'reveal-next' })}
                className="chaos-btn-secondary"
              >
                <span>
                  {state.currentRevealIndex + 1 >= state.totalAssignmentsNeeded
                    ? 'Trigger Royal Plot Twist! ⚔️'
                    : 'Next Secret Decree →'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* PHASE 5: Royal Plot Twist (King's Punishment) */}
      {state.phase === 'king-twist' && state.kingTwist && (
        <div className="space-y-5 text-center py-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-chaos-danger/15 text-chaos-danger text-xs font-extrabold uppercase tracking-wider">
            <Flame className="w-4 h-4" /> Royal Plot Twist — The King Is Not Safe!
          </div>

          <div className="p-6 rounded-card bg-chaos-bg dark:bg-chaos-dark-elevated border-2 border-chaos-danger/40 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-chaos-text-secondary">
              Decreed by {state.kingTwist.decreedByName}
            </p>
            <p className="text-xl sm:text-2xl font-bold">{state.kingTwist.text}</p>
            <p className="text-xs text-chaos-text-muted capitalize">
              Status: {state.kingTwist.status}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {state.kingTwist.status === 'pending' && (isKing || isHost) && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    chaosSound.victory();
                    socket.emit('game:action', {
                      action: 'resolve-king-twist',
                      data: { outcome: 'completed' },
                    });
                  }}
                  className="chaos-btn-primary"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>King Paid the Price (+25)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    socket.emit('game:action', {
                      action: 'resolve-king-twist',
                      data: { outcome: 'skipped' },
                    })
                  }
                  className="chaos-btn-secondary"
                >
                  Skip
                </button>
              </>
            )}

            {state.kingTwist.status !== 'pending' && isHost && (
              <button
                type="button"
                onClick={() => socket.emit('game:action', { action: 'next-round' })}
                className="chaos-btn-primary"
              >
                {state.round >= state.totalRounds
                  ? 'View Final Results 🏆'
                  : 'Play Next Round (New King) →'}
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
