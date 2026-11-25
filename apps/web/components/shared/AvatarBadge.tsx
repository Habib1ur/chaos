'use client';

import { AVATAR_PRESETS, type PlayerPresence } from '@chaos/shared';

export function AvatarBadge({
  avatarId,
  size = 'md',
  presence,
}: {
  avatarId: string;
  size?: 'sm' | 'md' | 'lg';
  presence?: PlayerPresence;
}) {
  const preset = AVATAR_PRESETS.find((a) => a.id === avatarId) ?? AVATAR_PRESETS[0];
  const dims =
    size === 'sm'
      ? 'w-8 h-8 text-base'
      : size === 'lg'
        ? 'w-14 h-14 text-2xl'
        : 'w-10 h-10 text-xl';

  const dotColor =
    presence === 'online' || presence === 'playing'
      ? 'bg-chaos-green dark:bg-chaos-dark-green'
      : presence === 'reconnecting'
        ? 'bg-chaos-warning'
        : 'bg-chaos-text-muted';

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={`${dims} rounded-full flex items-center justify-center shadow-sm border-2 border-white dark:border-chaos-dark-elevated`}
        style={{ backgroundColor: preset.bg }}
        aria-label={preset.label}
      >
        <span>{preset.emoji}</span>
      </div>
      {presence && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-chaos-dark-surface ${dotColor}`}
          title={presence}
        />
      )}
    </div>
  );
}
