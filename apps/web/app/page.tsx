import Link from 'next/link';
import { ArrowRight, Crown, EyeOff, Flame, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';
import { GAME_CATALOG } from '@chaos/shared';
import { FaqAccordion } from '@/components/shared/FaqAccordion';

export default function HomePage() {
  const featuredGames = GAME_CATALOG.filter((g) => g.featured);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-14 sm:py-24 px-4 sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[780px] h-[380px] rounded-full opacity-20 blur-3xl chaos-gradient"
        />
        <div className="max-w-6xl mx-auto relative z-10 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-chaos-blue-soft dark:bg-chaos-dark-elevated text-chaos-blue dark:text-chaos-dark-blue text-xs sm:text-sm font-semibold border border-chaos-blue/20">
              <Sparkles className="w-4 h-4" />
              <span>Friends. Games. Secrets. Absolute Chaos.</span>
            </div>

            <h1 className="hero-title font-extrabold text-chaos-text dark:text-chaos-dark-text">
              Your friends. Your secrets.{' '}
              <span className="chaos-gradient-text">Your CHAOS.</span>
            </h1>

            <p className="text-base sm:text-lg text-chaos-text-secondary dark:text-chaos-dark-text-secondary max-w-2xl mx-auto lg:mx-0">
              One place for hilarious dares, anonymous confessions, wild party games, and
              unforgettable moments. Create a private room in seconds—no app download or forced
              sign-up required.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 pt-2">
              <Link href="/room/create" className="chaos-btn-primary text-base px-6 py-3.5">
                <Zap className="w-5 h-5" />
                <span>Create a Room</span>
              </Link>
              <Link href="/room/join" className="chaos-btn-secondary text-base px-6 py-3.5">
                <span>Join with Code</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/games"
                className="px-5 py-3.5 min-h-[44px] inline-flex items-center justify-center text-sm font-semibold text-chaos-blue dark:text-chaos-dark-blue hover:underline"
              >
                Explore 11 Games
              </Link>
            </div>
          </div>

          {/* Interactive Preview Stack */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <div className="chaos-card p-5 border-l-4 border-l-chaos-blue">
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-chaos-blue dark:text-chaos-dark-blue">
                  <Crown className="w-4 h-4" /> Signature Mode
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-chaos-green-soft dark:bg-chaos-dark-elevated text-chaos-green dark:text-chaos-dark-green font-semibold">
                  3–16 Players
                </span>
              </div>
              <h2 className="font-bold text-lg">King&apos;s Truth or Dare</h2>
              <p className="text-sm text-chaos-text-secondary dark:text-chaos-dark-text-secondary mt-1">
                Secret numbers. One random King. Hidden assignments revealed one by one.
              </p>
            </div>

            <div className="chaos-card p-5 border-l-4 border-l-chaos-green">
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-chaos-green dark:text-chaos-dark-green">
                  <EyeOff className="w-4 h-4" /> Anonymous
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-chaos-blue-soft dark:bg-chaos-dark-elevated text-chaos-blue dark:text-chaos-dark-blue font-semibold">
                  Identity Guessing
                </span>
              </div>
              <h2 className="font-bold text-lg">Who Said That?</h2>
              <p className="text-sm text-chaos-text-secondary dark:text-chaos-dark-text-secondary mt-1">
                Submit anonymous confessions, shuffle them, and vote on who wrote each one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Games */}
      <section className="py-12 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold">Featured Party Modes</h2>
            <p className="text-sm sm:text-base text-chaos-text-secondary dark:text-chaos-dark-text-secondary mt-1">
              Switch between games anytime without leaving your room.
            </p>
          </div>
          <Link
            href="/games"
            className="text-sm font-semibold text-chaos-blue dark:text-chaos-dark-blue hover:underline shrink-0"
          >
            View all games →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredGames.map((game) => (
            <div key={game.id} className="chaos-card p-5 flex flex-col justify-between hover:-translate-y-0.5">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-chaos-blue-soft dark:bg-chaos-dark-elevated text-chaos-blue dark:text-chaos-dark-blue">
                    {game.badge ?? 'Party'}
                  </span>
                  <span className="text-xs text-chaos-text-muted">
                    {game.minPlayers}–{game.maxPlayers} players
                  </span>
                </div>
                <h3 className="font-bold text-lg">{game.name}</h3>
                <p className="text-sm text-chaos-text-secondary dark:text-chaos-dark-text-secondary mt-1.5">
                  {game.tagline}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-chaos-border dark:border-chaos-dark-border flex items-center justify-between">
                <span className="text-xs text-chaos-text-muted">{game.estimatedMinutes}</span>
                <Link
                  href={`/room/create?game=${game.id}`}
                  className="text-sm font-semibold text-chaos-green dark:text-chaos-dark-green hover:underline"
                >
                  Play Now →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="chaos-card p-6 sm:p-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-8">
            From Zero to Chaos in 3 Steps
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-btn chaos-gradient text-white font-bold flex items-center justify-center">
                1
              </div>
              <h3 className="font-bold text-lg">Create a Private Room</h3>
              <p className="text-sm text-chaos-text-secondary dark:text-chaos-dark-text-secondary">
                Pick a nickname and avatar. Set room visibility, content intensity, and optional password.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-btn chaos-gradient text-white font-bold flex items-center justify-center">
                2
              </div>
              <h3 className="font-bold text-lg">Invite Your Friends</h3>
              <p className="text-sm text-chaos-text-secondary dark:text-chaos-dark-text-secondary">
                Share your 6-character room code or one-click invite link. Friends join instantly as guests.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-btn chaos-gradient text-white font-bold flex items-center justify-center">
                3
              </div>
              <h3 className="font-bold text-lg">Play &amp; Switch Anytime</h3>
              <p className="text-sm text-chaos-text-secondary dark:text-chaos-dark-text-secondary">
                Start with Truth or Dare, crown a King, or play Who Said That?—all synced in real time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Play CHAOS */}
      <section className="py-10 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="chaos-card p-5 space-y-2">
            <Users className="w-6 h-6 text-chaos-blue dark:text-chaos-dark-blue" />
            <h3 className="font-bold">Guest-First Onboarding</h3>
            <p className="text-sm text-chaos-text-secondary dark:text-chaos-dark-text-secondary">
              Jump straight into a room without registration barriers. Accounts unlock stats and achievements.
            </p>
          </div>
          <div className="chaos-card p-5 space-y-2">
            <ShieldCheck className="w-6 h-6 text-chaos-green dark:text-chaos-dark-green" />
            <h3 className="font-bold">Consent &amp; Privacy First</h3>
            <p className="text-sm text-chaos-text-secondary dark:text-chaos-dark-text-secondary">
              Every player can skip, pass, or report. Anonymous authors stay hidden from other players.
            </p>
          </div>
          <div className="chaos-card p-5 space-y-2">
            <Flame className="w-6 h-6 text-chaos-blue dark:text-chaos-dark-blue" />
            <h3 className="font-bold">Real-Time Sync</h3>
            <p className="text-sm text-chaos-text-secondary dark:text-chaos-dark-text-secondary">
              Powered by a dedicated Socket.IO engine with automatic reconnection and room isolation.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-10 px-4 sm:px-6 max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold">Frequently Asked Questions</h2>
          <p className="text-sm text-chaos-text-secondary mt-1">
            Everything you need to know before starting your first room.
          </p>
        </div>
        <FaqAccordion />
      </section>

      <footer className="mt-12 border-t border-chaos-border dark:border-chaos-dark-border py-8 px-4 sm:px-6 text-center text-sm text-chaos-text-secondary dark:text-chaos-dark-text-secondary">
        <p className="font-semibold text-chaos-text dark:text-chaos-dark-text">
          CHAOS — Friends. Games. Secrets. Absolute Chaos.
        </p>
        <p className="mt-1">Built for safe, consensual, real-time multiplayer fun.</p>
      </footer>
    </div>
  );
}
