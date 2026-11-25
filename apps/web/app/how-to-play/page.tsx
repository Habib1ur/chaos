import Link from 'next/link';
import { Crown, EyeOff, Flame, Shield } from 'lucide-react';

export default function HowToPlayPage() {
  const guides = [
    {
      icon: Flame,
      title: 'Classic Truth or Dare',
      steps: [
        'The server randomly selects one player each round.',
        'That player chooses Truth or Dare.',
        'Players can submit custom prompts privately into the room pool.',
        'Complete the challenge for points, or use a Skip/Pass anytime.',
      ],
    },
    {
      icon: Crown,
      title: "King's Truth or Dare",
      steps: [
        'Every player is assigned a secret shuffled number.',
        'The server crowns one random player as the King.',
        'The King privately writes a Truth or Dare for each numbered player.',
        'Assignments are revealed one by one—no one sees them beforehand!',
      ],
    },
    {
      icon: EyeOff,
      title: 'Who Said That? (Anonymous)',
      steps: [
        'Everyone submits 1–2 anonymous confessions, opinions, or compliments.',
        'The server shuffles all submissions so order never leaks authorship.',
        'The room votes on who wrote each statement.',
        'Earn detective points for correct guesses, or bonus points if you fool everyone!',
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <div>
        <h1 className="page-title font-extrabold">How to Play CHAOS</h1>
        <p className="text-chaos-text-secondary dark:text-chaos-dark-text-secondary mt-2">
          Every game runs on a shared real-time room. Switch games anytime from the lobby or results screen.
        </p>
      </div>

      <div className="space-y-4">
        {guides.map((g) => (
          <div key={g.title} className="chaos-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <g.icon className="w-6 h-6 text-chaos-blue dark:text-chaos-dark-blue" />
              <h2 className="text-xl font-bold">{g.title}</h2>
            </div>
            <ul className="space-y-2 text-sm sm:text-base text-chaos-text-secondary dark:text-chaos-dark-text-secondary list-disc pl-5">
              {g.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="chaos-card p-6 border-l-4 border-l-chaos-green flex items-start gap-4">
        <Shield className="w-6 h-6 text-chaos-green dark:text-chaos-dark-green shrink-0 mt-0.5" />
        <div>
          <h2 className="font-bold text-lg">Safety &amp; Consent</h2>
          <p className="text-sm text-chaos-text-secondary dark:text-chaos-dark-text-secondary mt-1">
            You can always skip, pass, or report inappropriate submissions. Anonymous mode hides
            authors from other players in the room, while keeping moderation safety checks active.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/room/create" className="chaos-btn-primary">
          Create a Room
        </Link>
        <Link href="/games" className="chaos-btn-secondary">
          Browse All Games
        </Link>
      </div>
    </div>
  );
}
