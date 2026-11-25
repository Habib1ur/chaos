'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
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
import { AvatarBadge } from '@/components/shared/AvatarBadge';

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

const STEP_LABELS = [
  { id: 'coup-dares', label: '1. Coup Dares' },
  { id: 'shuffling', label: '2. Crown King' },
  { id: 'king-assigning', label: '3. Decrees' },
  { id: 'revealing', label: '4. Great Reveal' },
  { id: 'king-twist', label: '5. King Twist' },
];

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
  const kingPlayer = room.players.find((p) => p.id === state.kingPlayerId);

  const [coupText, setCoupText] = useState('');
  const [coupError, setCoupError] = useState<string | null>(null);
  const [shuffleIdx, setShuffleIdx] = useState(0);
  const [reviewingDecrees, setReviewingDecrees] = useState(false);

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

  // Shuffle animation ticker
  useEffect(() => {
    if (state.phase !== 'shuffling' || room.players.length === 0) return;
    const id = setInterval(() => {
      setShuffleIdx((prev) => (prev + 1) % room.players.length);
      chaosSound.click();
    }, 220);
    return () => clearInterval(id);
  }, [state.phase, room.players.length]);

  // Dramatic sound cues on phase transitions
  useEffect(() => {
    if (state.phase === 'king-announced' || state.phase === 'king-twist') {
      chaosSound.crown();
    }
    if (state.phase !== 'king-assigning') {
      setReviewingDecrees(false);
    }
  }, [state.phase]);

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

  const handleReviewDecrees = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    for (const num of targetNumbers) {
      const txt = (drafts[num]?.text ?? '').trim();
      if (txt.length < 4) {
        setError(`Please write at least 4 characters for Subject #${num}.`);
        return;
      }
    }
    chaosSound.click();
    setReviewingDecrees(true);
  };

  const confirmAndSubmitAssignments = () => {
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
        setReviewingDecrees(false);
      } else {
        chaosSound.crown();
      }
    });
  };

  const currentReveal = state.revealedAssignments[state.currentRevealIndex];
  const candidate = room.players[shuffleIdx % Math.max(1, room.players.length)];

  const activeStepIndex =
    state.phase === 'coup-dares'
      ? 0
      : state.phase === 'shuffling' || state.phase === 'king-announced'
        ? 1
        : state.phase === 'king-assigning'
          ? 2
          : state.phase === 'revealing'
            ? 3
            : 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="chaos-card p-5 sm:p-8 space-y-6"
    >
      {/* Top Meta & Stepper */}
      <div className="space-y-3">
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

        <div className="grid grid-cols-5 gap-1.5">
          {STEP_LABELS.map((step, i) => (
            <div
              key={step.id}
              className={`text-center py-1.5 px-1 rounded-lg text-[11px] font-bold truncate transition-colors ${
                i === activeStepIndex
                  ? 'chaos-gradient text-white shadow-sm'
                  : i < activeStepIndex
                    ? 'bg-chaos-green-soft dark:bg-chaos-dark-elevated text-chaos-green dark:text-chaos-dark-green'
                    : 'bg-chaos-bg dark:bg-chaos-dark-elevated text-chaos-text-muted'
              }`}
            >
              {step.label}
            </div>
          ))}
        </div>
      </div>

      {/* PHASE 1: Coup Dares */}
      {state.phase === 'coup-dares' && (
        <div className="space-y-5">
          <div className="p-5 rounded-card chaos-gradient text-white flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Swords className="w-8 h-8 shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-wider opacity-90 font-semibold">
                  Secret Rebellion Chamber
                </p>
                <h2 className="text-xl sm:text-2xl font-extrabold">
                  Write a Coup Dare for the Future King
                </h2>
              </div>
            </div>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold shrink-0">
              {state.coupDaresSubmittedPlayerIds.length} / {room.players.length} Sealed
            </span>
          </div>

          {/* Player Seal Status Pills */}
          <div className="flex flex-wrap gap-2">
            {room.players.map((p) => {
              const sealed = state.coupDaresSubmittedPlayerIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 border ${
                    sealed
                      ? 'border-chaos-green bg-chaos-green-soft/60 dark:bg-chaos-dark-elevated text-chaos-green'
                      : 'border-chaos-border dark:border-chaos-dark-border text-chaos-text-muted'
                  }`}
                >
                  <AvatarBadge avatarId={p.avatarId} size="sm" />
                  <span>{p.nickname}</span>
                  <span>{sealed ? '🔒' : '⏳'}</span>
                </div>
              );
            })}
          </div>

          {privateState?.hasSubmittedCoupDare ||
          state.coupDaresSubmittedPlayerIds.includes(playerId) ? (
            <div className="text-center py-6 space-y-3 bg-chaos-bg dark:bg-chaos-dark-elevated rounded-card p-6">
              <Lock className="w-9 h-9 text-chaos-green mx-auto" />
              <h3 className="text-lg font-bold">Your Coup Dare is Sealed!</h3>
              <p className="text-sm text-chaos-text-secondary">
                Waiting for everyone else ({state.coupDaresSubmittedPlayerIds.length}/
                {room.players.length}). Once sealed, the Crown will shuffle and pick a random King!
              </p>
              {isHost && (
                <button
                  type="button"
                  onClick={() => socket.emit('game:action', { action: 'start-king-selection' })}
                  className="chaos-btn-primary mt-2"
                >
                  <Crown className="w-4 h-4" />
                  <span>Shuffle &amp; Crown King Now →</span>
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={submitCoupDare} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-semibold">
                  Punishment Dare for whoever becomes King (or leave blank for random)
                </label>
                <button
                  type="button"
                  onClick={fillRandomCoupIdea}
                  className="text-xs font-bold inline-flex items-center gap-1 px-3 py-1.5 rounded-btn border border-chaos-border dark:border-chaos-dark-border hover:border-chaos-blue shrink-0"
                >
                  <Dices className="w-3.5 h-3.5 text-chaos-blue" />
                  <span>Idea</span>
                </button>
              </div>
              <textarea
                rows={4}
                maxLength={300}
                value={coupText}
                onChange={(e) => setCoupText(e.target.value)}
                placeholder="Write a hilarious punishment dare for the King..."
                className="w-full p-4 min-h-[110px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent focus:outline-none focus:ring-2 focus:ring-chaos-blue"
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

      {/* PHASE 2A: Live Shuffle Animation */}
      {state.phase === 'shuffling' && (
        <div className="text-center py-8 space-y-6">
          <p className="text-xs font-extrabold uppercase tracking-widest text-chaos-blue animate-pulse">
            The Crown Is Shuffling Candidates...
          </p>

          {candidate && (
            <motion.div
              key={candidate.id}
              initial={{ scale: 0.9, opacity: 0.7 }}
              animate={{ scale: 1.04, opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="max-w-xs mx-auto p-6 rounded-card chaos-gradient text-white shadow-glow space-y-3"
            >
              <Crown className="w-9 h-9 mx-auto animate-bounce" />
              <div className="flex justify-center">
                <AvatarBadge avatarId={candidate.avatarId} size="lg" />
              </div>
              <p className="text-2xl font-extrabold">{candidate.nickname}</p>
            </motion.div>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            {room.players.map((p) => (
              <div
                key={p.id}
                className={`p-1.5 rounded-full border-2 transition-all ${
                  candidate?.id === p.id
                    ? 'border-chaos-green scale-110'
                    : 'border-transparent opacity-50'
                }`}
              >
                <AvatarBadge avatarId={p.avatarId} size="sm" />
              </div>
            ))}
          </div>

          {(isHost || isKing) && (
            <button
              type="button"
              onClick={() => socket.emit('game:action', { action: 'skip-shuffle' })}
              className="chaos-btn-secondary text-xs"
            >
              Skip Shuffle
            </button>
          )}
        </div>
      )}

      {/* PHASE 2B: King Announced Spotlight */}
      {state.phase === 'king-announced' && kingPlayer && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          className="text-center py-6 space-y-5"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-chaos-warning/20 text-chaos-warning text-xs font-extrabold uppercase tracking-wider">
            <Crown className="w-4 h-4" /> All Hail the Secret King!
          </div>

          <div className="max-w-sm mx-auto p-6 rounded-card chaos-gradient text-white shadow-glow space-y-3">
            <div className="flex justify-center">
              <AvatarBadge avatarId={kingPlayer.avatarId} size="lg" />
            </div>
            <h2 className="text-3xl font-extrabold">
              {kingPlayer.nickname} {isKing ? '(You!)' : ''}
            </h2>
            <p className="text-xs opacity-90">
              {state.totalAssignmentsNeeded} subjects have secret numbers. Not even the King knows
              who holds which number!
            </p>
          </div>

          {isKing || isHost ? (
            <button
              type="button"
              onClick={() => socket.emit('game:action', { action: 'advance-to-assign' })}
              className="chaos-btn-primary"
            >
              <Crown className="w-4 h-4" />
              <span>Open King&apos;s Decree Panel →</span>
            </button>
          ) : (
            <p className="text-sm text-chaos-text-secondary">
              Waiting for King {kingPlayer.nickname} to open their decree panel...
            </p>
          )}
        </motion.div>
      )}

      {/* PHASE 3: King's Decree Studio + Recheck Step */}
      {state.phase === 'king-assigning' && (
        <>
          {isKing ? (
            reviewingDecrees ? (
              <div className="space-y-5">
                <div className="p-4 rounded-card chaos-gradient text-white flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider opacity-90 font-semibold">
                      Final Check
                    </p>
                    <h3 className="text-xl font-extrabold">Recheck Your Royal Decrees</h3>
                  </div>
                  <Crown className="w-7 h-7" />
                </div>

                <div className="space-y-3">
                  {targetNumbers.map((num) => {
                    const val = drafts[num];
                    if (!val) return null;
                    return (
                      <div
                        key={num}
                        className="p-4 rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-chaos-bg/60 dark:bg-chaos-dark-elevated space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-extrabold text-sm text-chaos-blue">
                            Subject #{num}
                            {val.jointTargetNumber ? ` 🤝 Joint with #${val.jointTargetNumber}` : ''}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase">
                            <span className="px-2 py-0.5 rounded-full bg-chaos-green-soft text-chaos-green">
                              {val.type}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-chaos-blue-soft text-chaos-blue">
                              {val.level}
                            </span>
                            {val.isStarPick && <span>⭐</span>}
                          </div>
                        </div>
                        <p className="text-sm font-medium">{val.text}</p>
                      </div>
                    );
                  })}
                </div>

                {error && <p className="text-sm text-chaos-danger font-medium">{error}</p>}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewingDecrees(false)}
                    className="chaos-btn-secondary"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Edit Decrees</span>
                  </button>
                  <button
                    type="button"
                    onClick={confirmAndSubmitAssignments}
                    className="chaos-btn-primary flex-1"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Confirm &amp; Seal All Decrees 👑</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReviewDecrees} className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-chaos-blue dark:text-chaos-dark-blue">
                  <Lock className="w-4 h-4" />
                  <span>
                    Private King Panel — Names are hidden! Write a mission for each secret number.
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
                        className="p-4 sm:p-5 rounded-btn border border-chaos-border dark:border-chaos-dark-border space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-extrabold text-base">Subject #{num}</span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => fillRandomMissionIdea(num, val.type)}
                              className="px-3 py-1.5 rounded-full text-xs font-bold border border-chaos-border dark:border-chaos-dark-border hover:border-chaos-blue inline-flex items-center gap-1"
                            >
                              <Dices className="w-3.5 h-3.5 text-chaos-blue" /> Idea
                            </button>
                            <button
                              type="button"
                              onClick={() => updateDraft(num, { type: 'truth' })}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold ${
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
                              className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                                val.type === 'dare'
                                  ? 'bg-chaos-green text-white'
                                  : 'border border-chaos-border dark:border-chaos-dark-border'
                              }`}
                            >
                              Dare
                            </button>
                          </div>
                        </div>

                        <textarea
                          required
                          rows={4}
                          minLength={4}
                          maxLength={280}
                          value={val.text}
                          onChange={(e) => updateDraft(num, { text: e.target.value })}
                          placeholder={`Write a secret ${val.type} for Subject #${num}...`}
                          className="w-full p-3.5 min-h-[108px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-chaos-blue"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex flex-wrap items-center gap-1">
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
                                    jointTargetNumber: e.target.value
                                      ? Number(e.target.value)
                                      : null,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-chaos-surface dark:bg-chaos-dark-elevated text-xs"
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
                              className={`px-2.5 py-1.5 rounded-full font-bold ${
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

                <button type="submit" className="chaos-btn-primary w-full py-3.5">
                  Review &amp; Recheck Decrees →
                </button>
              </form>
            )
          ) : (
            <div className="text-center py-10 space-y-4 bg-chaos-bg dark:bg-chaos-dark-elevated rounded-card p-6">
              {kingPlayer && (
                <div className="flex justify-center">
                  <AvatarBadge avatarId={kingPlayer.avatarId} size="lg" />
                </div>
              )}
              <Lock className="w-8 h-8 text-chaos-blue mx-auto animate-pulse" />
              <h3 className="text-xl font-bold">
                King {state.kingPlayerName} is writing secret decrees...
              </h3>
              <p className="text-sm text-chaos-text-secondary max-w-md mx-auto">
                Your secret number is <span className="font-bold">#{privateState?.myNumber}</span>.
                Even the King cannot see which player owns which number!
              </p>
            </div>
          )}
        </>
      )}

      {/* PHASE 4: The Great Reveal (Task First -> Dramatic Avatar & Name Unmask) */}
      {state.phase === 'revealing' && currentReveal && (
        <div className="space-y-5 text-center py-2">
          <div className="text-xs font-bold uppercase tracking-wider text-chaos-text-secondary">
            The Great Reveal • Mission {state.currentRevealIndex + 1} of{' '}
            {state.totalAssignmentsNeeded}
          </div>

          <div className="p-6 rounded-card bg-chaos-bg dark:bg-chaos-dark-elevated border border-chaos-border dark:border-chaos-dark-border space-y-5">
            {/* Number / Joint Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="px-3.5 py-1 rounded-full text-xs font-extrabold uppercase bg-chaos-blue text-white">
                Mystery Subject #{currentReveal.targetNumber}
              </span>

              {currentReveal.jointTargetNumber && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-chaos-green-soft text-chaos-green">
                  <Users className="w-3.5 h-3.5" />
                  Joint with #{currentReveal.jointTargetNumber}
                </span>
              )}

              {currentReveal.isStarPick && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-chaos-warning text-white">
                  ⭐ Star Pick
                </span>
              )}
            </div>

            {/* Mission Prompt First */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-chaos-green dark:text-chaos-dark-green">
                {currentReveal.type} • {currentReveal.level}
              </p>
              <p className="text-xl sm:text-2xl font-extrabold leading-snug">
                {currentReveal.text}
              </p>
            </div>

            {/* Dramatic Unmasked Player + Partner Avatars */}
            <AnimatePresence>
              {currentReveal.unmasked && currentReveal.targetPlayerName && (
                <motion.div
                  initial={{ scale: 0.75, opacity: 0, y: 12 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  className="pt-4 border-t border-chaos-border dark:border-chaos-dark-border flex flex-wrap items-center justify-center gap-6"
                >
                  <div className="flex flex-col items-center gap-2">
                    <AvatarBadge
                      avatarId={currentReveal.targetPlayerAvatar || 'fox'}
                      size="lg"
                    />
                    <div>
                      <p className="text-[11px] uppercase font-bold text-chaos-text-muted">
                        Subject #{currentReveal.targetNumber}
                      </p>
                      <p className="text-lg font-extrabold text-chaos-blue dark:text-chaos-dark-blue">
                        {currentReveal.targetPlayerName}
                      </p>
                    </div>
                  </div>

                  {currentReveal.jointTargetPlayerName && (
                    <>
                      <span className="text-2xl font-extrabold text-chaos-green">🤝</span>
                      <div className="flex flex-col items-center gap-2">
                        <AvatarBadge
                          avatarId={currentReveal.jointTargetPlayerAvatar || 'ghost'}
                          size="lg"
                        />
                        <div>
                          <p className="text-[11px] uppercase font-bold text-chaos-text-muted">
                            Partner #{currentReveal.jointTargetNumber}
                          </p>
                          <p className="text-lg font-extrabold text-chaos-green dark:text-chaos-dark-green">
                            {currentReveal.jointTargetPlayerName}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

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
                <span>
                  Reveal {currentReveal.jointTargetNumber ? 'Players!' : `Subject #${currentReveal.targetNumber}!`}{' '}
                  🎭
                </span>
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

      {/* PHASE 5: Royal Plot Twist */}
      {state.phase === 'king-twist' && state.kingTwist && (
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="space-y-5 text-center py-2"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-chaos-danger/15 text-chaos-danger text-xs font-extrabold uppercase tracking-wider">
            <Flame className="w-4 h-4" /> Royal Plot Twist — The King Is Not Safe!
          </div>

          <div className="p-6 rounded-card bg-chaos-bg dark:bg-chaos-dark-elevated border-2 border-chaos-danger/40 space-y-4">
            {kingPlayer && (
              <div className="flex flex-col items-center gap-2">
                <AvatarBadge avatarId={kingPlayer.avatarId} size="lg" />
                <p className="font-extrabold text-lg">King {kingPlayer.nickname}</p>
              </div>
            )}
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
        </motion.div>
      )}
    </motion.div>
  );
}
