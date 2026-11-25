'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DoorOpen } from 'lucide-react';
import { AVATAR_PRESETS } from '@chaos/shared';
import { getChaosSocket } from '@/lib/socket';
import { useChaosStore } from '@/stores/useChaosStore';

function JoinRoomForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useChaosStore((s) => s.setSession);

  const [code, setCode] = useState((searchParams.get('code') || '').toUpperCase());
  const [nickname, setNickname] = useState('');
  const [avatarId, setAvatarId] = useState<string>('ghost');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const socket = getChaosSocket();

    socket.emit(
      'room:join',
      {
        code: code.trim().toUpperCase(),
        nickname: nickname.trim(),
        avatarId,
        password: password.trim() || undefined,
      },
      (res) => {
        setLoading(false);
        if (!res.ok || !res.data) {
          setError(res.error || 'Could not join room.');
          return;
        }
        setSession(res.data);
        router.push(`/room/${res.data.room.code}`);
      }
    );
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="chaos-card p-6 sm:p-8 space-y-5">
        <div>
          <h1 className="page-title font-extrabold">Join a Room</h1>
          <p className="text-sm text-chaos-text-secondary dark:text-chaos-dark-text-secondary mt-1">
            Enter the 6-character code from your friend.
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Room Code</label>
            <input
              type="text"
              required
              minLength={4}
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. X7K9P2"
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent font-mono font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-chaos-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">Your Nickname</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={24}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Sam"
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent focus:outline-none focus:ring-2 focus:ring-chaos-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Pick Avatar</label>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_PRESETS.slice(0, 12).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAvatarId(a.id)}
                  className={`h-11 rounded-btn flex items-center justify-center text-xl ${
                    avatarId === a.id
                      ? 'ring-2 ring-chaos-blue bg-chaos-blue-soft dark:bg-chaos-dark-elevated'
                      : 'border border-chaos-border dark:border-chaos-dark-border'
                  }`}
                >
                  {a.emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">
              Password <span className="text-chaos-text-muted font-normal">(if required)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Optional"
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent"
            />
          </div>

          {error && (
            <p className="text-sm text-chaos-danger font-medium" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="chaos-btn-primary w-full py-3.5">
            <DoorOpen className="w-5 h-5" />
            <span>{loading ? 'Joining...' : 'Join Room'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function JoinRoomPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto p-8">Loading...</div>}>
      <JoinRoomForm />
    </Suspense>
  );
}
