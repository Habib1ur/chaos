'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'Do my friends need to create an account to play?',
    a: 'No! Anyone can join a CHAOS room in seconds as a guest with just a nickname and avatar. Registered accounts are optional for saving stats and achievements.',
  },
  {
    q: 'Are anonymous submissions in "Who Said That?" really hidden?',
    a: 'Yes—author identities are never sent to other players during submission or guessing, and submissions are shuffled on the server so order never leaks who wrote what.',
  },
  {
    q: 'Can we switch games without making a new room?',
    a: 'Yes! Once a game finishes (or from the lobby), the host can select any of the 11 CHAOS games and keep the exact same group together.',
  },
  {
    q: 'Is CHAOS safe for different friend groups?',
    a: 'Yes. Hosts choose Chill, Medium, or Spicy intensity, players can always Skip or Pass any prompt, and anyone can report inappropriate content.',
  },
];

export function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {FAQS.map((item, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div key={item.q} className="chaos-card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : idx)}
              className="w-full p-5 flex items-center justify-between gap-4 text-left font-bold"
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              <ChevronDown
                className={`w-5 h-5 text-chaos-text-muted shrink-0 transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-5 pb-5 text-sm text-chaos-text-secondary dark:text-chaos-dark-text-secondary">
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
