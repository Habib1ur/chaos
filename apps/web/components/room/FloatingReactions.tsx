'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useChaosStore } from '@/stores/useChaosStore';

export function FloatingReactions() {
  const reactions = useChaosStore((s) => s.reactions);
  const recent = reactions.slice(-8);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-24 right-4 sm:right-8 z-30 flex flex-col items-end gap-2"
    >
      <AnimatePresence>
        {recent.map((rx, idx) => (
          <motion.div
            key={rx.id}
            initial={{ opacity: 0, y: 20, scale: 0.6 }}
            animate={{ opacity: 1, y: -idx * 4, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.8 }}
            transition={{ duration: 0.45 }}
            className="px-3 py-1.5 rounded-full bg-chaos-surface/90 dark:bg-chaos-dark-elevated/90 border border-chaos-border dark:border-chaos-dark-border shadow-chaos flex items-center gap-1.5 text-sm"
          >
            <span className="text-lg">{rx.emoji}</span>
            <span className="text-xs font-semibold text-chaos-text-secondary">
              {rx.playerName}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
