'use client';

import { useChaosStore } from '@/stores/useChaosStore';

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!useChaosStore.getState().soundEnabled) return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx?.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function tone(freq: number, duration: number, type: OscillatorType = 'sine', delay = 0, gainVal = 0.08) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(gainVal, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

export const chaosSound = {
  click: () => tone(540, 0.06, 'triangle', 0, 0.05),
  chime: () => {
    tone(523.25, 0.14, 'sine', 0, 0.07);
    tone(659.25, 0.18, 'sine', 0.08, 0.07);
  },
  crown: () => {
    tone(440, 0.14, 'triangle', 0, 0.08);
    tone(554.37, 0.14, 'triangle', 0.1, 0.08);
    tone(659.25, 0.25, 'triangle', 0.2, 0.09);
  },
  reveal: () => {
    tone(392, 0.1, 'sine', 0, 0.06);
    tone(783.99, 0.22, 'sine', 0.09, 0.08);
  },
  victory: () => {
    tone(523.25, 0.12, 'triangle', 0, 0.08);
    tone(659.25, 0.12, 'triangle', 0.1, 0.08);
    tone(783.99, 0.12, 'triangle', 0.2, 0.08);
    tone(1046.5, 0.3, 'triangle', 0.3, 0.1);
  },
};
