'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dices, Heart, Search, Users } from 'lucide-react';
import { GAME_CATALOG, type GameCatalogCategory } from '@chaos/shared';

const CATEGORY_TABS: Array<{ id: 'all' | GameCatalogCategory; label: string }> = [
  { id: 'all', label: 'All Games' },
  { id: 'featured', label: 'Featured' },
  { id: 'truth-dare', label: 'Truth & Dare' },
  { id: 'anonymous', label: 'Anonymous' },
  { id: 'party', label: 'Party' },
  { id: 'voting', label: 'Voting' },
  { id: 'quick', label: 'Quick' },
  { id: 'custom', label: 'Custom' },
];

export default function GamesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | GameCatalogCategory>('all');
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('chaos_favorites') || '[]');
    } catch {
      return [];
    }
  });

  const filteredGames = useMemo(() => {
    return GAME_CATALOG.filter((g) => {
      const matchesCat = category === 'all' || g.categories.includes(category);
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.tagline.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [category, search]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem('chaos_favorites', JSON.stringify(next));
      return next;
    });
  };

  const surpriseMe = () => {
    const pick = GAME_CATALOG[Math.floor(Math.random() * GAME_CATALOG.length)];
    router.push(`/room/create?game=${pick.id}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="page-title font-extrabold">CHAOS Game Library</h1>
          <p className="text-chaos-text-secondary dark:text-chaos-dark-text-secondary mt-1">
            Pick a game to launch a room, or let fate decide.
          </p>
        </div>
        <button type="button" onClick={surpriseMe} className="chaos-btn-secondary shrink-0">
          <Dices className="w-4 h-4 text-chaos-green dark:text-chaos-dark-green" />
          <span>Surprise Me</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-chaos-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search games..."
            className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-btn border border-chaos-border dark:border-chaos-dark-border bg-chaos-surface dark:bg-chaos-dark-surface focus:outline-none focus:ring-2 focus:ring-chaos-blue"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCategory(tab.id)}
            className={`px-4 py-2 min-h-[40px] rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              category === tab.id
                ? 'chaos-gradient text-white'
                : 'bg-chaos-surface dark:bg-chaos-dark-surface border border-chaos-border dark:border-chaos-dark-border text-chaos-text-secondary dark:text-chaos-dark-text-secondary hover:border-chaos-blue'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGames.map((game) => {
          const isFav = favorites.includes(game.id);
          return (
            <div key={game.id} className="chaos-card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-chaos-blue-soft dark:bg-chaos-dark-elevated text-chaos-blue dark:text-chaos-dark-blue">
                    {game.badge ?? game.categories[0]}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(game.id)}
                    aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    className="p-2 rounded-full hover:bg-chaos-bg dark:hover:bg-chaos-dark-elevated"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isFav ? 'fill-chaos-danger text-chaos-danger' : 'text-chaos-text-muted'
                      }`}
                    />
                  </button>
                </div>
                <h2 className="font-bold text-xl">{game.name}</h2>
                <p className="text-sm text-chaos-text-secondary dark:text-chaos-dark-text-secondary mt-1.5">
                  {game.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-chaos-border dark:border-chaos-dark-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs text-chaos-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {game.minPlayers}–{game.maxPlayers}
                  </span>
                  <span>{game.estimatedMinutes}</span>
                </div>
                <Link
                  href={`/room/create?game=${game.id}`}
                  className="chaos-btn-primary text-sm px-4 py-2"
                >
                  Play
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
