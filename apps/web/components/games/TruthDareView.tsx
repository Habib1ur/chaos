'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Flame, MessageSquarePlus, SkipForward, Sparkles } from 'lucide-react';
import type { RoomState, TruthDareState } from '@chaos/shared';
import { getChaosSocket } from '@/lib/socket';
import { chaosSound } from '@/lib/sound';
import { CountdownTimer } from '@/components/shared/CountdownTimer';

export function TruthDareView({
  room,
  state,
  playerId,
}: {
  room: RoomState;
  state: TruthDareState;
  playerId: string;
}) {
  const socket = getChaosSocket();
  const isHost = room.hostId === playerId;
  const isActivePlayer = state.activePlayerId === playerId;
  const activePlayer = room.players.find((p) => p.id === state.activePlayerId);

  const [showSubmit, setShowSubmit] = useState(false);
  const [subType, setSubType] = useState<'truth' | 'dare'>('truth');
  const [subText, setSubText] = useState('');
  const [subFeedback, setSubFeedback] = useState<string | null>(null);

  const submitCustomPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    setSubFeedback(null);
    socket.emit(
      'game:submit',
      {
        type: subType,
        text: subText,
        category: 'funny',
        intensity: room.settings.intensity,
        anonymous: true,
      },
      (res) => {
        if (res?.ok) {
          setSubText('');
          setSubFeedback('Prompt added to the room pool!');
          setTimeout(() => setShowSubmit(false), 1000);
        } else {
          setSubFeedback(res?.error || 'Could not submit.');
        }
      }
    );
  };

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="chaos-card p-6 sm:p-8 space-y-6"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-chaos-blue-soft dark:bg-chaos-dark-elevated text-chaos-blue dark:text-chaos-dark-blue">
            Round {state.round} of {state.totalRounds}
          </span>
          {room.settings.allowPlayerSubmissions && (
            <button
              type="button"
              onClick={() => setShowSubmit(!showSubmit)}
              className="text-xs font-semibold inline-flex items-center gap-1.5 text-chaos-green dark:text-chaos-dark-green hover:underline min-h-[36px]"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>Submit Prompt</span>
            </button>
          )}
        </div>

        {/* Choosing Type Phase */}
        {state.phase === 'choosing-type' && (
          <div className="text-center space-y-5 py-4">
            <CountdownTimer endsAt={state.endsAt} totalSeconds={room.settings.timerSeconds} />
            <p className="text-sm text-chaos-text-secondary">It&apos;s turn for:</p>
            <h2 className="text-3xl font-extrabold chaos-gradient-text">
              {activePlayer?.nickname ?? 'Player'}
            </h2>

            {isActivePlayer ? (
              <div className="grid sm:grid-cols-2 gap-4 max-w-md mx-auto pt-2">
                <button
                  type="button"
                  onClick={() => socket.emit('game:action', { action: 'choose-type', data: { choice: 'truth' } })}
                  className="p-6 rounded-card border-2 border-chaos-blue bg-chaos-blue-soft/60 dark:bg-chaos-dark-elevated hover:scale-[1.02] transition-transform text-center space-y-1"
                >
                  <Sparkles className="w-7 h-7 text-chaos-blue mx-auto" />
                  <span className="block font-extrabold text-xl">TRUTH</span>
                  <span className="block text-xs text-chaos-text-secondary">+10 pts</span>
                </button>
                <button
                  type="button"
                  onClick={() => socket.emit('game:action', { action: 'choose-type', data: { choice: 'dare' } })}
                  className="p-6 rounded-card border-2 border-chaos-green bg-chaos-green-soft/60 dark:bg-chaos-dark-elevated hover:scale-[1.02] transition-transform text-center space-y-1"
                >
                  <Flame className="w-7 h-7 text-chaos-green mx-auto" />
                  <span className="block font-extrabold text-xl">DARE</span>
                  <span className="block text-xs text-chaos-text-secondary">+15 pts</span>
                </button>
              </div>
            ) : (
              <p className="text-sm text-chaos-text-secondary">
                Waiting for {activePlayer?.nickname} to pick Truth or Dare...
              </p>
            )}
          </div>
        )}

        {/* Performing Phase */}
        {state.phase === 'performing' && state.currentPrompt && (
          <div className="space-y-6 text-center py-2">
            <CountdownTimer endsAt={state.endsAt} totalSeconds={room.settings.timerSeconds} />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-chaos-green-soft dark:bg-chaos-dark-elevated text-chaos-green dark:text-chaos-dark-green">
              {activePlayer?.nickname} chose {state.choice}
            </div>

            <div className="p-6 rounded-card bg-chaos-bg dark:bg-chaos-dark-elevated border border-chaos-border dark:border-chaos-dark-border">
              <p className="text-xl sm:text-2xl font-bold leading-snug">
                {state.currentPrompt.text}
              </p>
            </div>

            {(isActivePlayer || isHost) && (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    chaosSound.chime();
                    socket.emit('game:action', { action: 'complete' });
                  }}
                  className="chaos-btn-primary"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Completed!</span>
                </button>
                {room.settings.allowSkip && (
                  <button
                    type="button"
                    onClick={() => socket.emit('game:action', { action: 'skip' })}
                    className="chaos-btn-secondary"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>Skip</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => socket.emit('game:action', { action: 'pass' })}
                  className="chaos-btn-secondary"
                >
                  Pass
                </button>
              </div>
            )}
          </div>
        )}

        {/* Round Summary */}
        {state.phase === 'round-summary' && state.lastOutcome && (
          <div className="text-center space-y-4 py-4">
            <h3 className="text-2xl font-extrabold">
              {state.lastOutcome.playerName}{' '}
              {state.lastOutcome.outcome === 'completed'
                ? 'crushed it!'
                : state.lastOutcome.outcome === 'skipped'
                  ? 'skipped this one.'
                  : 'passed.'}
            </h3>
            {state.lastOutcome.pointsAwarded > 0 && (
              <p className="text-chaos-green dark:text-chaos-dark-green font-bold">
                +{state.lastOutcome.pointsAwarded} points awarded!
              </p>
            )}
            {(isHost || isActivePlayer) && (
              <button
                type="button"
                onClick={() => socket.emit('game:action', { action: 'next-round' })}
                className="chaos-btn-primary"
              >
                {state.round >= state.totalRounds ? 'View Final Results' : 'Next Player →'}
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Player Custom Prompt Submission Drawer */}
      {showSubmit && (
        <form onSubmit={submitCustomPrompt} className="chaos-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">Submit a Private Truth or Dare</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSubType('truth')}
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  subType === 'truth'
                    ? 'bg-chaos-blue text-white'
                    : 'border border-chaos-border dark:border-chaos-dark-border'
                }`}
              >
                Truth
              </button>
              <button
                type="button"
                onClick={() => setSubType('dare')}
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  subType === 'dare'
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
            minLength={5}
            maxLength={280}
            value={subText}
            onChange={(e) => setSubText(e.target.value)}
            placeholder={`Write a ${subType} for the room...`}
            className="w-full px-3.5 py-2.5 rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent"
          />
          {subFeedback && <p className="text-xs font-semibold text-chaos-green">{subFeedback}</p>}
          <button type="submit" className="chaos-btn-primary text-sm">
            Add to Pool
          </button>
        </form>
      )}
    </div>
  );
}
