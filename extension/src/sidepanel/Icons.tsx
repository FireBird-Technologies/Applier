import type { ReactNode } from "react";

const Svg = ({ size = 16, children }: { size?: number; children: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

export const EyeIcon = ({ size }: { size?: number }) => (
  <Svg size={size}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Svg>
);
export const ExpandIcon = ({ size }: { size?: number }) => (
  <Svg size={size}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></Svg>
);
export const CloseIcon = ({ size }: { size?: number }) => (
  <Svg size={size}><path d="M18 6L6 18M6 6l12 12" /></Svg>
);

/** Circle that draws itself, then a tick. Black on white. */
export function SuccessTick({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Success">
      <circle className="tick-circle" cx="28" cy="28" r="24" />
      <path className="tick-check" d="M17 29l8 8 14-16" />
    </svg>
  );
}
