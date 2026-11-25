'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Check,
  Copy,
  Crown,
  LogOut,
  Play,
  QrCode,
  Settings2,
  Shield,
  Trash2,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CONTENT_INTENSITIES, GAME_CATALOG, type ContentIntensity, type GameId } from '@chaos/shared';
import { getChaosSocket } from '@/lib/socket';
import { useChaosStore } from '@/stores/useChaosStore';
import { AvatarBadge } from '@/components/shared/AvatarBadge';
import { RoomChat } from '@/components/room/RoomChat';
import { FloatingReactions } from '@/components/room/FloatingReactions';
import { QrInviteModal } from '@/components/room/QrInviteModal';
import { ResultsView } from '@/components/room/ResultsView';
import { TruthDareView } from '@/components/games/TruthDareView';
import { KingsGameView } from '@/components/games/KingsGameView';
import { WhoSaidThatView } from '@/components/games/WhoSaidThatView';
import { PartyGameView } from '@/components/games/PartyGameView';

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params.code || '').toUpperCase();

  const {
    room,
    playerId,
    gameState,
    kingsPrivate,
    results,
    soundEnabled,
    setSession,
    setRoom,
    setGameState,
    setKingsPrivate,
    setResults,
    addChatMessage,
    addReaction,
    toggleSound,
    clearRoom,
  } = useChaosStore();

  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [socketConnected, setSocketConnected] = useState(true);

  useEffect(() => {
    const socket = getChaosSocket();
    setSocketConnected(socket.connected);

    const attemptReconnect = () => {
      setSocketConnected(true);
      if (!code) return;
      const savedRaw = sessionStorage.getItem(`chaos_room_${code}`);
      if (!savedRaw) return;
      try {
        const saved = JSON.parse(savedRaw) as { playerId: string; sessionToken: string };
        if (!room) setReconnecting(true);
        socket.emit(
          'player:reconnect',
          { roomCode: code, sessionToken: saved.sessionToken },
          (res) => {
            setReconnecting(false);
            if (res.ok && res.data) {
              setSession({
                room: res.data.room,
                playerId: res.data.playerId,
                sessionToken: saved.sessionToken,
              });
              if (res.data.gameState) setGameState(res.data.gameState);
              if (res.data.kingsPrivate) setKingsPrivate(res.data.kingsPrivate);
            } else {
              // Room no longer exists on server; clear stale session so user sees Join Room
              sessionStorage.removeItem(`chaos_room_${code}`);
              clearRoom();
            }
          }
        );
      } catch {
        setReconnecting(false);
      }
    };

    const onDisconnect = () => {
      setSocketConnected(false);
    };

    const onRoomUpdated = (updated: typeof room) => {
      if (updated) setRoom(updated);
    };
    const onGameStarted = (state: typeof gameState) => {
      setResults(null);
      setGameState(state);
    };
    const onGameUpdated = (state: typeof gameState) => {
      setGameState(state);
    };
    const onKingsPrivate = (priv: typeof kingsPrivate) => {
      setKingsPrivate(priv);
    };
    const onGameResults = (summary: typeof results) => {
      setResults(summary);
    };
    const onChatMessage = (msg: Parameters<typeof addChatMessage>[0]) => {
      addChatMessage(msg);
    };
    const onReaction = (rx: Parameters<typeof addReaction>[0]) => {
      addReaction(rx);
    };
    const onKicked = () => {
      clearRoom();
      router.push('/room/join');
    };

    socket.on('connect', attemptReconnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:updated', onRoomUpdated);
    socket.on('game:started', onGameStarted);
    socket.on('game:updated', onGameUpdated);
    socket.on('game:kings:private', onKingsPrivate);
    socket.on('game:results', onGameResults);
    socket.on('chat:message', onChatMessage);
    socket.on('reaction:received', onReaction);
    socket.on('room:kicked', onKicked);

    // Run immediately if socket is already connected and we don't have room state yet
    if (!room && socket.connected) {
      attemptReconnect();
    }

    return () => {
      socket.off('connect', attemptReconnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:updated', onRoomUpdated);
      socket.off('game:started', onGameStarted);
      socket.off('game:updated', onGameUpdated);
      socket.off('game:kings:private', onKingsPrivate);
      socket.off('game:results', onGameResults);
      socket.off('chat:message', onChatMessage);
      socket.off('reaction:received', onReaction);
      socket.off('room:kicked', onKicked);
    };
  }, [code]);

  const copyInviteLink = async () => {
    const url = `${window.location.origin}/room/join?code=${code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveRoom = () => {
    const socket = getChaosSocket();
    socket.emit('room:leave', () => {
      clearRoom();
      router.push('/');
    });
  };

  if (reconnecting) {
    return (
      <div className="max-w-md mx-auto p-10 text-center">
        <div className="chaos-card p-8 space-y-2">
          <p className="font-bold text-lg">Reconnecting to Room {code}...</p>
          <p className="text-sm text-chaos-text-secondary">Restoring your session and game state.</p>
        </div>
      </div>
    );
  }

  if (!room || !playerId) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <div className="chaos-card p-8 space-y-4">
          <h1 className="text-2xl font-extrabold">Room {code}</h1>
          <p className="text-sm text-chaos-text-secondary">
            Join this room with your nickname to enter the lobby.
          </p>
          <Link href={`/room/join?code=${code}`} className="chaos-btn-primary w-full">
            Join Room {code}
          </Link>
        </div>
      </div>
    );
  }

  const isHost = room.hostId === playerId;
  const me = room.players.find((p) => p.id === playerId);
  const selectedGameMeta = GAME_CATALOG.find((g) => g.id === room.selectedGame);
  const socket = getChaosSocket();

  const startGame = () => {
    setError(null);
    socket.emit('game:start', (res) => {
      if (!res?.ok) setError(res?.error || 'Unable to start game.');
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Room Header */}
      <div className="chaos-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-extrabold text-xl sm:text-2xl">{room.name}</h1>
              <button
                type="button"
                onClick={copyInviteLink}
                title="Click to copy invite link"
                className="font-mono text-lg sm:text-2xl font-extrabold tracking-[0.2em] px-4 py-1.5 rounded-btn bg-chaos-blue-soft dark:bg-chaos-dark-elevated text-chaos-blue dark:text-chaos-dark-blue border border-chaos-blue/30 hover:border-chaos-blue transition-colors"
              >
                {room.code}
              </button>
            </div>
            <p className="text-xs sm:text-sm text-chaos-text-secondary mt-1 flex items-center gap-2">
              <span>
                {selectedGameMeta?.name} • {room.players.length}/{room.settings.maxPlayers} players
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  socketConnected
                    ? 'bg-chaos-green-soft text-chaos-green dark:bg-chaos-dark-elevated'
                    : 'bg-chaos-warning/20 text-chaos-warning'
                }`}
              >
                {socketConnected ? '● Live' : '● Reconnecting...'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={copyInviteLink} className="chaos-btn-secondary text-xs px-3 py-2">
            {copied ? <Check className="w-4 h-4 text-chaos-green" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Link!' : 'Invite Friends'}</span>
          </button>

          <button
            type="button"
            onClick={() => setQrOpen(true)}
            aria-label="Show QR invite code"
            className="chaos-btn-secondary text-xs px-3 py-2"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">QR</span>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            aria-label="Toggle sound effects"
            className="w-11 h-11 rounded-btn border border-chaos-border dark:border-chaos-dark-border flex items-center justify-center"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-chaos-text-muted" />}
          </button>

          {isHost && room.status === 'playing' && (
            <button
              type="button"
              onClick={() => socket.emit('game:end')}
              className="chaos-btn-secondary text-xs px-3 py-2 text-chaos-danger"
            >
              End Game
            </button>
          )}

          <button
            type="button"
            onClick={leaveRoom}
            className="chaos-btn-secondary text-xs px-3 py-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-btn bg-chaos-danger/10 border border-chaos-danger/30 text-chaos-danger text-sm font-medium">
          {error}
        </div>
      )}

      {/* Main Layout */}
      <div className="grid lg:grid-cols-12 gap-6 lg:items-stretch">
        {/* Left/Center Main Stage */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {room.status === 'results' && results ? (
            <ResultsView results={results} isHost={isHost} />
          ) : room.status === 'playing' && gameState ? (
            <>
              {gameState.gameId === 'truth-dare' && (
                <TruthDareView room={room} state={gameState} playerId={playerId} />
              )}
              {gameState.gameId === 'kings-game' && (
                <KingsGameView
                  room={room}
                  state={gameState}
                  privateState={kingsPrivate}
                  playerId={playerId}
                />
              )}
              {gameState.gameId === 'who-said-that' && (
                <WhoSaidThatView room={room} state={gameState} playerId={playerId} />
              )}
              {gameState.gameId !== 'truth-dare' &&
                gameState.gameId !== 'kings-game' &&
                gameState.gameId !== 'who-said-that' && (
                  <PartyGameView room={room} state={gameState} playerId={playerId} />
                )}
            </>
          ) : (
            /* Lobby View */
            <div className="chaos-card p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-chaos-green dark:text-chaos-dark-green">
                    Room Lobby
                  </span>
                  <h2 className="text-2xl font-extrabold mt-0.5">{selectedGameMeta?.name}</h2>
                  <p className="text-sm text-chaos-text-secondary mt-1">
                    {selectedGameMeta?.description}
                  </p>
                </div>
                {!isHost && (
                  <button
                    type="button"
                    onClick={() => socket.emit('room:ready', { isReady: !me?.isReady })}
                    className={me?.isReady ? 'chaos-btn-secondary' : 'chaos-btn-primary'}
                  >
                    {me?.isReady ? 'Ready ✓' : 'Mark Ready'}
                  </button>
                )}
              </div>

              {/* Host Controls */}
              {isHost && (
                <div className="p-4 rounded-card bg-chaos-bg dark:bg-chaos-dark-elevated border border-chaos-border dark:border-chaos-dark-border space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Settings2 className="w-4 h-4 text-chaos-blue" />
                    <span>Host Game &amp; Room Controls</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Selected Game</label>
                      <select
                        value={room.selectedGame}
                        onChange={(e) =>
                          socket.emit('game:select', { gameId: e.target.value as GameId })
                        }
                        className="w-full px-3 py-2 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-chaos-surface dark:bg-chaos-dark-surface text-sm"
                      >
                        {GAME_CATALOG.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Intensity</label>
                      <select
                        value={room.settings.intensity}
                        onChange={(e) =>
                          socket.emit('room:settings:update', {
                            intensity: e.target.value as ContentIntensity,
                          })
                        }
                        className="w-full px-3 py-2 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-chaos-surface dark:bg-chaos-dark-surface text-sm capitalize"
                      >
                        {CONTENT_INTENSITIES.map((i) => (
                          <option key={i} value={i}>
                            {i}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Round Timer</label>
                      <select
                        value={room.settings.timerSeconds}
                        onChange={(e) =>
                          socket.emit('room:settings:update', {
                            timerSeconds: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-chaos-surface dark:bg-chaos-dark-surface text-sm"
                      >
                        <option value={0}>No Timer (Untimed)</option>
                        <option value={15}>15 seconds</option>
                        <option value={30}>30 seconds</option>
                        <option value={45}>45 seconds</option>
                        <option value={60}>60 seconds</option>
                        <option value={90}>90 seconds</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Who Said That? Mode
                      </label>
                      <select
                        value={room.settings.anonymousMode ?? 'classic'}
                        onChange={(e) =>
                          socket.emit('room:settings:update', {
                            anonymousMode: e.target.value as 'classic' | 'spotlight',
                          })
                        }
                        className="w-full px-3 py-2 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-chaos-surface dark:bg-chaos-dark-surface text-sm"
                      >
                        <option value="classic">Everyone Submits (Classic)</option>
                        <option value="spotlight">Spotlight (1 Stays, Others Msg)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Anonymous Msgs / Player
                      </label>
                      <select
                        value={room.settings.anonymousMessagesPerPlayer ?? 2}
                        onChange={(e) =>
                          socket.emit('room:settings:update', {
                            anonymousMessagesPerPlayer: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-chaos-surface dark:bg-chaos-dark-surface text-sm"
                      >
                        <option value={1}>1 message</option>
                        <option value={2}>2 messages</option>
                        <option value={3}>3 messages</option>
                        <option value={5}>5 messages</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs font-medium">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={room.settings.allowPlayerSubmissions}
                        onChange={(e) =>
                          socket.emit('room:settings:update', {
                            allowPlayerSubmissions: e.target.checked,
                          })
                        }
                      />
                      Allow player submissions
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={room.settings.revealAuthorsInAnonymous}
                        onChange={(e) =>
                          socket.emit('room:settings:update', {
                            revealAuthorsInAnonymous: e.target.checked,
                          })
                        }
                      />
                      Reveal authors in Who Said That?
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={room.settings.isLocked}
                        onChange={(e) =>
                          socket.emit('room:settings:update', { isLocked: e.target.checked })
                        }
                      />
                      Lock room
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={startGame}
                    disabled={!socketConnected}
                    className="chaos-btn-primary w-full py-3.5"
                  >
                    <Play className="w-5 h-5" />
                    <span>
                      {room.players.length < (selectedGameMeta?.minPlayers ?? 2)
                        ? `Need at least ${selectedGameMeta?.minPlayers ?? 2} players to start`
                        : `Start ${selectedGameMeta?.name}`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Players & Chat */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="chaos-card p-4 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-chaos-blue" />
                <span>Players ({room.players.length})</span>
              </h3>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {room.players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-btn bg-chaos-bg/60 dark:bg-chaos-dark-elevated/60"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AvatarBadge avatarId={p.avatarId} size="sm" presence={p.presence} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate flex items-center gap-1">
                        {p.nickname}
                        {p.id === playerId && (
                          <span className="text-xs text-chaos-text-muted">(You)</span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-chaos-text-secondary">
                        {p.isHost && (
                          <span className="inline-flex items-center gap-0.5 text-chaos-blue font-bold">
                            <Crown className="w-3 h-3" /> Host
                          </span>
                        )}
                        {room.settings.enableScoring && <span>{p.score} pts</span>}
                      </div>
                    </div>
                  </div>

                  {isHost && p.id !== playerId && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Make Host"
                        onClick={() =>
                          socket.emit('room:host:transfer', { targetPlayerId: p.id })
                        }
                        className="p-1.5 rounded-lg hover:bg-chaos-surface dark:hover:bg-chaos-dark-surface text-chaos-text-muted hover:text-chaos-blue"
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Kick Player"
                        onClick={() => socket.emit('room:kick', { targetPlayerId: p.id })}
                        className="p-1.5 rounded-lg hover:bg-chaos-surface dark:hover:bg-chaos-dark-surface text-chaos-text-muted hover:text-chaos-danger"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <RoomChat enabled={room.settings.enableChat} />
        </div>
      </div>

      <FloatingReactions />
      <QrInviteModal code={room.code} open={qrOpen} onClose={() => setQrOpen(false)} />
    </div>
  );
}
