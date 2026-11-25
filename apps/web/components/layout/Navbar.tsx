'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Plus, Sun, Trophy, User } from 'lucide-react';
import { ChaosLogo } from '../shared/ChaosLogo';
import { CommandSearch } from './CommandSearch';
import { useTheme } from './Providers';
import { useChaosStore } from '@/stores/useChaosStore';

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const user = useChaosStore((s) => s.user);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/games', label: 'Games' },
    { href: '/decks', label: 'Decks' },
    { href: '/how-to-play', label: 'How to Play' },
    { href: '/leaderboard', label: 'Leaderboard' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-chaos-border dark:border-chaos-dark-border bg-chaos-surface/85 dark:bg-chaos-dark-surface/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-chaos-blue rounded-lg">
          <ChaosLogo />
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Primary navigation">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-2 rounded-btn text-sm font-medium transition-colors ${
                  active
                    ? 'bg-chaos-blue-soft text-chaos-blue dark:bg-chaos-dark-elevated dark:text-chaos-dark-blue'
                    : 'text-chaos-text-secondary dark:text-chaos-dark-text-secondary hover:text-chaos-text dark:hover:text-chaos-dark-text'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <CommandSearch />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="w-11 h-11 rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-chaos-surface dark:bg-chaos-dark-elevated flex items-center justify-center text-chaos-text-secondary dark:text-chaos-dark-text-secondary hover:border-chaos-blue transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <Link
            href="/profile"
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border text-sm font-semibold hover:border-chaos-blue transition-colors"
          >
            <User className="w-4 h-4" />
            <span>{user?.displayName || user?.nickname || 'Sign In'}</span>
          </Link>

          <Link
            href="/room/create"
            className="chaos-btn-primary text-sm px-4 py-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create Room</span>
            <span className="sm:hidden">Create</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  // Hide bottom nav inside active game rooms to maximize play space
  if (pathname.startsWith('/room/') && pathname !== '/room/create' && pathname !== '/room/join') {
    return null;
  }

  const items = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/games', label: 'Games', icon: '🎮' },
    { href: '/room/join', label: 'Rooms', icon: '🚪' },
    { href: '/leaderboard', label: 'Ranks', icon: '🏆' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-chaos-border dark:border-chaos-dark-border bg-chaos-surface/95 dark:bg-chaos-dark-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-16">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 text-xs font-medium min-h-[44px] ${
                active
                  ? 'text-chaos-blue dark:text-chaos-dark-blue font-semibold'
                  : 'text-chaos-text-secondary dark:text-chaos-dark-text-secondary'
              }`}
            >
              <span className="text-lg leading-none" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
