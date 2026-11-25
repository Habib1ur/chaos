import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        chaos: {
          blue: '#3478F6',
          'blue-deep': '#2455C5',
          navy: '#132B4F',
          sky: '#5BB7F5',
          'blue-soft': '#EAF3FF',
          green: '#16A36A',
          'green-deep': '#087F5B',
          emerald: '#10B981',
          mint: '#DDF8EC',
          'green-soft': '#EFFBF5',
          teal: '#16B8A6',
          cyan: '#37C6D0',
          bg: '#F6F9FC',
          surface: '#FFFFFF',
          text: '#172B3A',
          'text-secondary': '#687B8B',
          'text-muted': '#96A5B2',
          border: '#E4EBF2',
          warning: '#F2A93B',
          danger: '#E65C68',
          // Dark mode palette
          'dark-bg': '#0B1220',
          'dark-surface': '#111C2D',
          'dark-elevated': '#18263A',
          'dark-secondary': '#1E3046',
          'dark-text': '#F4F8FC',
          'dark-text-secondary': '#A7B7CA',
          'dark-border': '#26384D',
          'dark-green': '#34D399',
          'dark-blue': '#60A5FA',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        btn: '12px',
        card: '18px',
        container: '24px',
      },
      boxShadow: {
        chaos: '0 8px 30px rgba(19, 43, 79, 0.08)',
        'chaos-dark': '0 10px 36px rgba(0, 0, 0, 0.35)',
        glow: '0 8px 24px rgba(52, 120, 246, 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
