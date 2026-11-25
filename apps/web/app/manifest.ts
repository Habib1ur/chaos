import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CHAOS — Multiplayer Social Gaming',
    short_name: 'CHAOS',
    description: 'Friends. Games. Secrets. Absolute Chaos.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B1220',
    theme_color: '#3478F6',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
