'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Award, Lock, Radio, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface PublicRoomSummary {
  code: string;
  name: string;
  selectedGame: string;
  playerCount: number;
  maxPlayers: number;
  status: string;
  hasPassword: boolean;
}

const ACHIEVEMENT_LIST = [
  { icon: '👑', name: 'King of Chaos', desc: 'Be crowned the King in King’s Truth or Dare.' },
  { icon: '💬', name: 'Truth Machine', desc: 'Complete 10 Truth prompts without skipping.' },
  { icon: '🔥', name: 'Daredevil', desc: 'Complete 10 Dare challenges.' },
  { icon: '🕵️', name: 'Master Detective', desc: 'Guess the author 5 times in Who Said That?' },
  { icon: '🎭', name: 'Anonymous Legend', desc: 'Fool the entire room with an anonymous statement.' },
  { icon: '🎉', name: 'Party Starter', desc: 'Host your first multiplayer CHAOS room.' },
];

export default function LeaderboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['public-rooms'],
    queryFn: () => apiFetch<{ ok: boolean; rooms: PublicRoomSummary[] }>('/api/rooms/public'),
    refetchInterval: 5000,
  });

  const publicRooms = data?.rooms ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <div>
        <h1 className="page-title font-extrabold">Live Rooms &amp; Achievements</h1>
        <p className="text-chaos-text-secondary dark:text-chaos-dark-text-secondary mt-1">
          Join an open public room or unlock CHAOS badges with friends.
        </p>
      </div>

      {/* Live Public Rooms */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Radio className="w-5 h-5 text-chaos-green dark:text-chaos-dark-green" />
            <span>Open Public Rooms</span>
          </h2>
          <Link href="/room/create" className="text-sm font-semibold text-chaos-blue hover:underline">
            + Host a Room
          </Link>
        </div>

        {isLoading ? (
          <div className="chaos-card p-6 text-sm text-chaos-text-secondary">Loading live rooms...</div>
        ) : publicRooms.length === 0 ? (
          <div className="chaos-card p-6 text-center space-y-3">
            <p className="text-chaos-text-secondary dark:text-chaos-dark-text-secondary">
              No public rooms are open right now. Start one and invite the world!
            </p>
            <Link href="/room/create" className="chaos-btn-primary text-sm">
              Create Public Room
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {publicRooms.map((r) => (
              <div key={r.code} className="chaos-card p-5 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{r.name}</h3>
                    {r.hasPassword && <Lock className="w-4 h-4 text-chaos-warning" />}
                  </div>
                  <p className="text-xs text-chaos-text-secondary mt-1">
                    Code: <span className="font-mono font-bold">{r.code}</span> • Game: {r.selectedGame}
                  </p>
                  <p className="text-xs text-chaos-text-muted mt-0.5 inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {r.playerCount} / {r.maxPlayers} players
                  </p>
                </div>
                <Link href={`/room/join?code=${r.code}`} className="chaos-btn-primary text-sm px-4 py-2">
                  Join
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Achievements */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Award className="w-5 h-5 text-chaos-blue dark:text-chaos-dark-blue" />
          <span>CHAOS Achievements</span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACHIEVEMENT_LIST.map((a) => (
            <div key={a.name} className="chaos-card p-4 flex items-start gap-3">
              <span className="text-2xl">{a.icon}</span>
              <div>
                <h3 className="font-bold text-sm">{a.name}</h3>
                <p className="text-xs text-chaos-text-secondary dark:text-chaos-dark-text-secondary mt-0.5">
                  {a.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
