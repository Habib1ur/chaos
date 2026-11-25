'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Users } from 'lucide-react';
import {
  AVATAR_PRESETS,
  CONTENT_INTENSITIES,
  GAME_CATALOG,
  GAME_IDS,
  type ContentIntensity,
  type GameId,
  type RoomVisibility,
} from '@chaos/shared';
import { getChaosSocket } from '@/lib/socket';
import { useChaosStore } from '@/stores/useChaosStore';

function CreateRoomForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGame = (searchParams.get('game') as GameId) || 'truth-dare';
  const validInitialGame = GAME_IDS.includes(initialGame) ? initialGame : 'truth-dare';

  const setSession = useChaosStore((s) => s.setSession);

  const [nickname, setNickname] = useState('');
  const [avatarId, setAvatarId] = useState<string>('fox');
  const [roomName, setRoomName] = useState('Chaos Party');
  const [selectedGame, setSelectedGame] = useState<GameId>(validInitialGame);
  const [visibility, setVisibility] = useState<RoomVisibility>('private');
  const [maxPlayers, setMaxPlayers] = useState(12);
  const [intensity, setIntensity] = useState<ContentIntensity>('medium');
  const [timerSeconds, setTimerSeconds] = useState(45);
  const [anonymousMode, setAnonymousMode] = useState<'classic' | 'spotlight'>('classic');
  const [anonymousMessagesPerPlayer, setAnonymousMessagesPerPlayer] = useState(2);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const socket = getChaosSocket();

    socket.emit(
      'room:create',
      {
        roomName: roomName.trim() || 'Chaos Party',
        nickname: nickname.trim(),
        avatarId,
        selectedGame,
        visibility,
        maxPlayers,
        intensity,
        timerSeconds,
        anonymousMode,
        anonymousMessagesPerPlayer,
        password: password.trim() || undefined,
        categories: ['funny', 'lighthearted', 'friendship', 'creative'],
      },
      (res) => {
        setLoading(false);
        if (!res.ok || !res.data) {
          setError(res.error || 'Could not create room.');
          return;
        }
        setSession(res.data);
        router.push(`/room/${res.data.room.code}`);
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="chaos-card p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="page-title font-extrabold">Create a CHAOS Room</h1>
          <p className="text-sm text-chaos-text-secondary dark:text-chaos-dark-text-secondary mt-1">
            Configure your private lobby and invite friends in one click.
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Your Nickname</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={24}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent focus:outline-none focus:ring-2 focus:ring-chaos-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Room Name</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={40}
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent focus:outline-none focus:ring-2 focus:ring-chaos-blue"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Choose Avatar</label>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
              {AVATAR_PRESETS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAvatarId(a.id)}
                  title={a.label}
                  className={`h-11 rounded-btn flex items-center justify-center text-xl transition-all ${
                    avatarId === a.id
                      ? 'ring-2 ring-chaos-blue scale-105 bg-chaos-blue-soft dark:bg-chaos-dark-elevated'
                      : 'border border-chaos-border dark:border-chaos-dark-border hover:border-chaos-blue'
                  }`}
                >
                  {a.emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">Starting Game</label>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value as GameId)}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-chaos-surface dark:bg-chaos-dark-elevated focus:outline-none focus:ring-2 focus:ring-chaos-blue"
            >
              {GAME_CATALOG.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.minPlayers}–{g.maxPlayers} players)
                </option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as RoomVisibility)}
                className="w-full px-3 py-2.5 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-chaos-surface dark:bg-chaos-dark-elevated"
              >
                <option value="private">Private (Code Only)</option>
                <option value="public">Public (Listed)</option>
                <option value="invite-only">Invite Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Content Intensity</label>
              <select
                value={intensity}
                onChange={(e) => setIntensity(e.target.value as ContentIntensity)}
                className="w-full px-3 py-2.5 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-chaos-surface dark:bg-chaos-dark-elevated capitalize"
              >
                {CONTENT_INTENSITIES.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Max Players ({maxPlayers})
              </label>
              <div className="flex items-center gap-2 min-h-[44px]">
                <Users className="w-4 h-4 text-chaos-text-muted shrink-0" />
                <input
                  type="range"
                  min={2}
                  max={16}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full accent-chaos-blue"
                />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Round Timer</label>
              <select
                value={timerSeconds}
                onChange={(e) => setTimerSeconds(Number(e.target.value))}
                className="w-full px-3 py-2.5 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-chaos-surface dark:bg-chaos-dark-elevated"
              >
                <option value={0}>No Timer (Untimed)</option>
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={45}>45 seconds</option>
                <option value={60}>60 seconds</option>
                <option value={90}>90 seconds</option>
              </select>
            </div>

            {selectedGame === 'who-said-that' && (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    Who Said That? Mode
                  </label>
                  <select
                    value={anonymousMode}
                    onChange={(e) => setAnonymousMode(e.target.value as 'classic' | 'spotlight')}
                    className="w-full px-3 py-2.5 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-chaos-surface dark:bg-chaos-dark-elevated"
                  >
                    <option value="classic">Everyone Submits (Classic)</option>
                    <option value="spotlight">Spotlight (1 Stays, Others Msg)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    Anonymous Msgs / Player
                  </label>
                  <select
                    value={anonymousMessagesPerPlayer}
                    onChange={(e) => setAnonymousMessagesPerPlayer(Number(e.target.value))}
                    className="w-full px-3 py-2.5 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-chaos-surface dark:bg-chaos-dark-elevated"
                  >
                    <option value={1}>1 message</option>
                    <option value={2}>2 messages</option>
                    <option value={3}>3 messages</option>
                    <option value={5}>5 messages</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">
              Room Password <span className="text-chaos-text-muted font-normal">(optional)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for no password"
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent"
            />
          </div>

          {error && (
            <p className="text-sm text-chaos-danger font-medium" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="chaos-btn-primary w-full py-3.5 text-base">
            <Sparkles className="w-5 h-5" />
            <span>{loading ? 'Creating Room...' : 'Create Room & Enter Lobby'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CreateRoomPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto p-8">Loading...</div>}>
      <CreateRoomForm />
    </Suspense>
  );
}
