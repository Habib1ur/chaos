'use client';

import { useEffect, useState } from 'react';
import type { PartyOption } from '@chaos/shared';
import { chaosSound } from '@/lib/sound';

const SLICE_COLORS = [
  '#3478F6',
  '#16A36A',
  '#2455C5',
  '#10B981',
  '#5BB7F5',
  '#087F5B',
  '#16B8A6',
  '#37C6D0',
  '#132B4F',
  '#34D399',
  '#60A5FA',
  '#1E3046',
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeSlice(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

export function SpinningWheel({
  options,
  winnerIndex,
}: {
  options: PartyOption[];
  winnerIndex: number | null | undefined;
}) {
  const [rotation, setRotation] = useState(0);
  const [settled, setSettled] = useState(false);

  const count = Math.max(2, options.length);
  const sliceAngle = 360 / count;

  useEffect(() => {
    if (winnerIndex == null || winnerIndex < 0 || winnerIndex >= count) {
      setSettled(false);
      return;
    }
    setSettled(false);
    // Align center of winning slice to 0deg (top pointer) after 5 full spins
    const targetSliceCenter = winnerIndex * sliceAngle + sliceAngle / 2;
    const finalAngle = 360 * 5 + (360 - targetSliceCenter);
    setRotation(finalAngle);

    const timer = setTimeout(() => {
      setSettled(true);
      chaosSound.victory();
    }, 3900);

    return () => clearTimeout(timer);
  }, [winnerIndex, count, sliceAngle]);

  const cx = 160;
  const cy = 160;
  const r = 142;

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="relative w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] flex items-center justify-center">
        {/* Top Pointer */}
        <div
          aria-hidden="true"
          className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 drop-shadow-md"
        >
          <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
            <path
              d="M14 30L2 6C1.2 4.4 2.4 2 4.2 2H23.8C25.6 2 26.8 4.4 26 6L14 30Z"
              fill="#F2A93B"
              stroke="#FFFFFF"
              strokeWidth="2.5"
            />
          </svg>
        </div>

        {/* Outer Glow Ring */}
        <div className="absolute inset-2 rounded-full chaos-gradient opacity-20 blur-xl pointer-events-none" />

        {/* Wheel SVG */}
        <svg
          viewBox="0 0 320 320"
          className="w-full h-full drop-shadow-xl"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 3.8s cubic-bezier(0.15, 0.85, 0.2, 1)',
          }}
        >
          {/* Outer Rim */}
          <circle cx={cx} cy={cy} r={154} fill="#132B4F" stroke="#3478F6" strokeWidth="4" />

          {/* Rim Lights */}
          {Array.from({ length: 16 }).map((_, i) => {
            const pos = polarToCartesian(cx, cy, 148, i * 22.5);
            return (
              <circle
                key={i}
                cx={pos.x}
                cy={pos.y}
                r="2.8"
                fill={i % 2 === 0 ? '#DDF8EC' : '#5BB7F5'}
              />
            );
          })}

          {/* Slices */}
          {options.map((opt, idx) => {
            const start = idx * sliceAngle;
            const end = start + sliceAngle;
            const mid = start + sliceAngle / 2;
            const labelPos = polarToCartesian(cx, cy, 92, mid);
            const color = SLICE_COLORS[idx % SLICE_COLORS.length];
            const isWinner = settled && winnerIndex === idx;

            return (
              <g key={opt.id}>
                <path
                  d={describeSlice(cx, cy, r, start, end)}
                  fill={color}
                  stroke="#FFFFFF"
                  strokeWidth={isWinner ? '3' : '1.5'}
                  opacity={settled && !isWinner ? 0.72 : 1}
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  fill="#FFFFFF"
                  fontSize={count > 8 ? '10' : '12'}
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${mid - 90}, ${labelPos.x}, ${labelPos.y})`}
                >
                  {opt.label.length > 12 ? `${opt.label.slice(0, 11)}…` : opt.label}
                </text>
              </g>
            );
          })}

          {/* Center Hub */}
          <circle cx={cx} cy={cy} r="26" fill="#FFFFFF" stroke="#132B4F" strokeWidth="4" />
          <circle cx={cx} cy={cy} r="14" fill="#16A36A" />
        </svg>
      </div>

      {settled && winnerIndex != null && options[winnerIndex] && (
        <div className="px-5 py-2.5 rounded-full chaos-gradient text-white font-extrabold text-lg shadow-glow animate-bounce">
          🎉 Winner: {options[winnerIndex].label}
        </div>
      )}
    </div>
  );
}
