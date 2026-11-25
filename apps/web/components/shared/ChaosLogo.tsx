import React from 'react';

export function ChaosLogo({
  size = 34,
  showWordmark = true,
}: {
  size?: number;
  showWordmark?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="chaosLogoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3478F6" />
            <stop offset="100%" stopColor="#16A36A" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="12" fill="url(#chaosLogoGrad)" />
        <path
          d="M25.5 13.5C23.9 12.1 21.8 11.4 19.6 11.5C14.7 11.7 11 15.6 11 20.5C11 25.4 14.9 29 19.8 29C22.2 29 24.3 28.1 25.9 26.6"
          stroke="white"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M27.5 17.5L30.5 20.5L27.5 23.5"
          stroke="#DDF8EC"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="20" r="2.6" fill="#DDF8EC" />
      </svg>
      {showWordmark && (
        <span className="font-extrabold tracking-tight text-xl text-chaos-text dark:text-chaos-dark-text">
          CHAOS
        </span>
      )}
    </span>
  );
}
