'use client';

import { useState } from 'react';
import { LogOut, ShieldCheck, UserPlus } from 'lucide-react';
import { AVATAR_PRESETS } from '@chaos/shared';
import { apiFetch } from '@/lib/api';
import { useChaosStore, type AuthUser } from '@/stores/useChaosStore';
import { AvatarBadge } from '@/components/shared/AvatarBadge';

export default function ProfilePage() {
  const { user, setUser } = useChaosStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await apiFetch<{ ok: boolean; user: AuthUser; token: string }>(
          '/api/auth/register',
          {
            method: 'POST',
            body: JSON.stringify({ email, username, displayName, password }),
          }
        );
        localStorage.setItem('chaos_auth_token', res.token);
        setUser(res.user);
      } else {
        const res = await apiFetch<{ ok: boolean; user: AuthUser; token: string }>(
          '/api/auth/login',
          {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          }
        );
        localStorage.setItem('chaos_auth_token', res.token);
        setUser(res.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('chaos_auth_token');
    setUser(null);
  };

  if (user) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div className="chaos-card p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <AvatarBadge avatarId={user.avatarId} size="lg" presence="online" />
            <div>
              <h1 className="text-2xl font-extrabold">{user.displayName || user.nickname}</h1>
              <p className="text-sm text-chaos-text-secondary">
                {user.isGuest ? 'Guest Session' : `@${user.username} • ${user.email}`}
              </p>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="chaos-btn-secondary">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="chaos-card p-4 text-center">
            <p className="text-2xl font-extrabold text-chaos-blue">{user.gamesPlayed ?? 0}</p>
            <p className="text-xs text-chaos-text-secondary mt-1">Games Played</p>
          </div>
          <div className="chaos-card p-4 text-center">
            <p className="text-2xl font-extrabold text-chaos-green">{user.gamesWon ?? 0}</p>
            <p className="text-xs text-chaos-text-secondary mt-1">Games Won</p>
          </div>
          <div className="chaos-card p-4 text-center">
            <p className="text-2xl font-extrabold">{user.totalScore ?? 0}</p>
            <p className="text-xs text-chaos-text-secondary mt-1">Total Score</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-10">
      <div className="chaos-card p-6 sm:p-8 space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold">
            {mode === 'login' ? 'Sign In to CHAOS' : 'Create CHAOS Account'}
          </h1>
          <p className="text-sm text-chaos-text-secondary">
            Optional! You can always play as a guest without an account.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 rounded-btn bg-chaos-bg dark:bg-chaos-dark-bg">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2 rounded-lg text-sm font-semibold ${
              mode === 'login'
                ? 'bg-chaos-surface dark:bg-chaos-dark-elevated shadow-sm'
                : 'text-chaos-text-secondary'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2 rounded-lg text-sm font-semibold ${
              mode === 'register'
                ? 'bg-chaos-surface dark:bg-chaos-dark-elevated shadow-sm'
                : 'text-chaos-text-secondary'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent"
              placeholder="you@example.com"
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent"
                  placeholder="chaos_legend"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent"
                  placeholder="Alex"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-semibold mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-chaos-danger font-medium" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="chaos-btn-primary w-full">
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
          </button>
        </form>

        <div className="pt-3 border-t border-chaos-border dark:border-chaos-dark-border flex items-center gap-2 text-xs text-chaos-text-muted">
          <ShieldCheck className="w-4 h-4 text-chaos-green shrink-0" />
          <span>Passwords are salted &amp; hashed with scrypt. {AVATAR_PRESETS.length} avatars included.</span>
        </div>
      </div>
    </div>
  );
}
