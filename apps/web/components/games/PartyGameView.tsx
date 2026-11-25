'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Disc, Sparkles } from 'lucide-react';
import { GAME_CATALOG, type PartyGameState, type RoomState } from '@chaos/shared';
import { getChaosSocket } from '@/lib/socket';
import { CountdownTimer } from '@/components/shared/CountdownTimer';
import { SpinningWheel } from '@/components/games/SpinningWheel';

export function PartyGameView({
  room,
  state,
  playerId,
}: {
  room: RoomState;
  state: PartyGameState;
  playerId: string;
}) {
  const socket = getChaosSocket();
  const isHost = room.hostId === playerId;
  const meta = GAME_CATALOG.find((g) => g.id === state.gameId);
  const hasVoted = state.votedPlayerIds.includes(playerId);

  // Two Truths & A Lie form state
  const [tt1, setTt1] = useState('');
  const [tt2, setTt2] = useState('');
  const [tt3, setTt3] = useState('');
  const [lieIdx, setLieIdx] = useState<0 | 1 | 2>(2);

  // Wheel / Poll form state
  const [wheelText, setWheelText] = useState(
    room.players.map((p) => p.nickname).join('\n')
  );
  const [pollQ, setPollQ] = useState('');
  const [pollOpts, setPollOpts] = useState('Option A\nOption B\nOption C');

  const submitTwoTruths = (e: React.FormEvent) => {
    e.preventDefault();
    socket.emit('game:submit', { statements: [tt1, tt2, tt3], lieIndex: lieIdx });
  };

  const spinWheel = () => {
    const items = wheelText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length < 2) return;
    socket.emit('game:submit', { items });
  };

  const createPoll = (e: React.FormEvent) => {
    e.preventDefault();
    const options = pollOpts
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (options.length < 2) return;
    socket.emit('game:submit', { question: pollQ, options });
  };

  const totalVotes = Object.values(state.voteCounts).reduce((a, b) => a + b, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="chaos-card p-6 sm:p-8 space-y-6"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-chaos-blue-soft dark:bg-chaos-dark-elevated text-chaos-blue dark:text-chaos-dark-blue">
          {meta?.name ?? state.gameId}
        </span>
        <span className="text-xs font-semibold text-chaos-text-secondary">
          Round {state.round} of {state.totalRounds}
        </span>
      </div>

      {/* Prompt phase for Two Truths / Wheel / Custom Polls */}
      {state.phase === 'prompt' && state.gameId === 'two-truths-lie' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">{state.promptText}</h2>
          {state.storytellerId === playerId ? (
            <form onSubmit={submitTwoTruths} className="space-y-3">
              {[
                { val: tt1, set: setTt1, idx: 0 as const },
                { val: tt2, set: setTt2, idx: 1 as const },
                { val: tt3, set: setTt3, idx: 2 as const },
              ].map((item) => (
                <div key={item.idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="lie"
                    checked={lieIdx === item.idx}
                    onChange={() => setLieIdx(item.idx)}
                    aria-label={`Mark statement ${item.idx + 1} as the lie`}
                  />
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={item.val}
                    onChange={(e) => item.set(e.target.value)}
                    placeholder={`Statement #${item.idx + 1} ${lieIdx === item.idx ? '(LIE)' : '(TRUTH)'}`}
                    className="flex-1 px-3.5 py-2.5 rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent"
                  />
                </div>
              ))}
              <button type="submit" className="chaos-btn-primary">
                Lock In Statements
              </button>
            </form>
          ) : (
            <p className="text-sm text-chaos-text-secondary">
              Waiting for the storyteller to write 2 truths and 1 lie...
            </p>
          )}
        </div>
      )}

      {state.phase === 'prompt' && state.gameId === 'random-wheel' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Disc className="w-6 h-6 text-chaos-blue" />
            <span>Random Wheel</span>
          </h2>
          {isHost ? (
            <div className="space-y-3">
              <textarea
                rows={4}
                value={wheelText}
                onChange={(e) => setWheelText(e.target.value)}
                placeholder="One option per line..."
                className="w-full p-3 rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent text-sm"
              />
              <button type="button" onClick={spinWheel} className="chaos-btn-primary">
                <Sparkles className="w-4 h-4" />
                <span>Spin the Wheel!</span>
              </button>
            </div>
          ) : (
            <p className="text-sm text-chaos-text-secondary">
              Host is configuring the wheel slices...
            </p>
          )}
        </div>
      )}

      {state.phase === 'prompt' && state.gameId === 'custom-polls' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Custom Room Poll</h2>
          {isHost ? (
            <form onSubmit={createPoll} className="space-y-3">
              <input
                type="text"
                required
                value={pollQ}
                onChange={(e) => setPollQ(e.target.value)}
                placeholder="Ask a question..."
                className="w-full px-3.5 py-2.5 rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent"
              />
              <textarea
                rows={3}
                value={pollOpts}
                onChange={(e) => setPollOpts(e.target.value)}
                placeholder="One option per line..."
                className="w-full p-3 rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent text-sm"
              />
              <button type="submit" className="chaos-btn-primary">
                Launch Poll
              </button>
            </form>
          ) : (
            <p className="text-sm text-chaos-text-secondary">
              Host is creating a custom poll...
            </p>
          )}
        </div>
      )}

      {/* Voting / Reveal Phase */}
      {(state.phase === 'voting' || state.phase === 'reveal') && (
        <div className="space-y-5">
          {state.phase === 'voting' && (
            <CountdownTimer endsAt={state.endsAt} totalSeconds={room.settings.timerSeconds || 45} />
          )}
          {state.phase === 'reveal' && state.endsAt && (
            <div className="max-w-xs mx-auto">
              <CountdownTimer endsAt={state.endsAt} totalSeconds={5} />
            </div>
          )}

          {state.gameId === 'random-wheel' && state.phase === 'reveal' ? (
            <SpinningWheel options={state.options} winnerIndex={state.wheelWinnerIndex} />
          ) : (
            <>
              <h2 className="text-2xl font-extrabold text-center">{state.promptText}</h2>

              <div className="grid sm:grid-cols-2 gap-3">
                {state.options.map((opt) => {
                  const count = state.voteCounts[opt.id] ?? 0;
                  const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  const isWinner = state.phase === 'reveal' && state.winnerOptionId === opt.id;
                  const isCorrect = state.phase === 'reveal' && state.correctOptionId === opt.id;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={state.phase !== 'voting' || hasVoted}
                      onClick={() => socket.emit('game:vote', { optionId: opt.id })}
                      className={`p-4 rounded-btn border text-left transition-all space-y-2 ${
                        isCorrect || isWinner
                          ? 'border-chaos-green bg-chaos-green-soft/60 dark:bg-chaos-dark-elevated'
                          : 'border-chaos-border dark:border-chaos-dark-border hover:border-chaos-blue'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold">{opt.label}</span>
                        {(isCorrect || isWinner) && (
                          <Check className="w-5 h-5 text-chaos-green shrink-0" />
                        )}
                      </div>
                      {state.phase === 'reveal' && (
                        <div className="space-y-1">
                          <div className="h-2 rounded-full bg-chaos-bg dark:bg-chaos-dark-bg overflow-hidden">
                            <div
                              className="h-full chaos-gradient transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-chaos-text-secondary">
                            {count} votes ({pct}%)
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {state.phase === 'voting' && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-chaos-text-secondary">
                {state.votedPlayerIds.length} / {room.players.length} voted
              </span>
              {isHost && (
                <button
                  type="button"
                  onClick={() => socket.emit('game:action', { action: 'reveal' })}
                  className="chaos-btn-primary"
                >
                  Reveal Results
                </button>
              )}
            </div>
          )}

          {state.phase === 'reveal' && (
            <div className="space-y-3 pt-2">
              {state.roundPoints && Object.keys(state.roundPoints).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(state.roundPoints).map(([pid, award]) => {
                    const p = room.players.find((pl) => pl.id === pid);
                    if (!p) return null;
                    return (
                      <span
                        key={pid}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          award.points > 0
                            ? 'bg-chaos-green-soft text-chaos-green dark:bg-chaos-dark-elevated'
                            : 'bg-chaos-bg text-chaos-text-muted dark:bg-chaos-dark-elevated'
                        }`}
                      >
                        {p.nickname}: {award.points > 0 ? `+${award.points} pts` : ''}
                        {award.label ? ` (${award.label})` : ''}
                      </span>
                    );
                  })}
                </div>
              )}
              {isHost && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => socket.emit('game:action', { action: 'next-round' })}
                    className="chaos-btn-primary"
                  >
                    {state.round >= state.totalRounds ? 'View Final Results' : 'Next Round →'}
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
