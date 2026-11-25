'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search, X } from 'lucide-react';
import { GAME_CATALOG } from '@chaos/shared';

export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const games = GAME_CATALOG.filter(
      (g) => !q || g.name.toLowerCase().includes(q) || g.tagline.toLowerCase().includes(q)
    ).map((g) => ({
      id: g.id,
      title: g.name,
      subtitle: g.tagline,
      href: `/room/create?game=${g.id}`,
      badge: g.badge ?? 'Game',
    }));

    const quickLinks = [
      { id: 'create', title: 'Create a Room', subtitle: 'Start a new private or public lobby', href: '/room/create', badge: 'Action' },
      { id: 'join', title: 'Join with Code', subtitle: 'Enter a 6-character room code', href: '/room/join', badge: 'Action' },
      { id: 'decks', title: 'Custom Prompt Decks', subtitle: 'Build and save your own prompt packs', href: '/decks', badge: 'Page' },
      { id: 'leaderboard', title: 'Live Public Rooms & Ranks', subtitle: 'Browse open rooms and achievements', href: '/leaderboard', badge: 'Page' },
    ].filter((l) => !q || l.title.toLowerCase().includes(q));

    return [...quickLinks, ...games].slice(0, 8);
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden lg:inline-flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-chaos-bg/60 dark:bg-chaos-dark-elevated text-xs text-chaos-text-secondary hover:border-chaos-blue transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Quick search...</span>
        <kbd className="px-1.5 py-0.5 rounded bg-chaos-surface dark:bg-chaos-dark-surface border border-chaos-border dark:border-chaos-dark-border text-[10px] font-mono">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Quick search"
        >
          <div className="chaos-card max-w-lg w-full overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-chaos-border dark:border-chaos-dark-border">
              <Search className="w-4 h-4 text-chaos-text-muted shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search games, rooms, or pages..."
                className="flex-1 bg-transparent focus:outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close search"
                className="p-1.5 rounded-lg hover:bg-chaos-bg dark:hover:bg-chaos-dark-elevated"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go(item.href)}
                  className="w-full p-3 rounded-btn hover:bg-chaos-blue-soft/60 dark:hover:bg-chaos-dark-elevated flex items-center justify-between gap-3 text-left transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{item.title}</p>
                    <p className="text-xs text-chaos-text-secondary truncate">{item.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-chaos-bg dark:bg-chaos-dark-surface text-chaos-text-secondary">
                      {item.badge}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-chaos-text-muted" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
