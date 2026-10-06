"use client";

import { useMemo } from "react";
import styles from "./Celebration.module.css";

/**
 * Full-bleed celebration overlay: theme-colored confetti "rain" falling from the
 * top + a centered success card with a pop-in checkmark and burst ring. Pure CSS
 * (no deps). Colors come from the app's brand/accent theme tokens.
 */

const CONFETTI_COLORS = [
  "rgb(var(--brand-primary))",
  "rgb(var(--brand-highlight))",
  "rgb(var(--brand-accent))",
  "rgb(var(--color-success))",
  "rgb(var(--color-warning))",
];

const PIECE_COUNT = 70;

interface Piece {
  left: number; // %
  delay: number; // s
  duration: number; // s
  size: number; // px
  color: string;
  rounded: boolean;
  drift: number; // px horizontal sway
  rotate: number; // deg
}

function buildPieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => {
    const rand = (seed: number) => {
      const x = Math.sin(seed * 99.13 + i * 17.7) * 43758.5453;
      return x - Math.floor(x);
    };
    return {
      left: rand(1) * 100,
      delay: rand(2) * 2.2,
      duration: 2.6 + rand(3) * 2.2,
      size: 6 + Math.floor(rand(4) * 8),
      color: CONFETTI_COLORS[Math.floor(rand(5) * CONFETTI_COLORS.length)],
      rounded: rand(6) > 0.5,
      drift: (rand(7) - 0.5) * 120,
      rotate: rand(8) * 720 - 360,
    };
  });
}

export function Celebration({ children }: { children: React.ReactNode }) {
  const pieces = useMemo(() => buildPieces(), []);

  return (
    <div className={styles.root}>
      {/* Confetti rain */}
      <div className={styles.confettiLayer} aria-hidden>
        {pieces.map((p, i) => (
          <span
            key={i}
            className={styles.confettiPiece}
            style={
              {
                left: `${p.left}%`,
                width: p.size,
                height: p.rounded ? p.size : p.size * 0.5,
                backgroundColor: p.color,
                borderRadius: p.rounded ? "50%" : "2px",
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                "--drift": `${p.drift}px`,
                "--rotate": `${p.rotate}deg`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Centered content */}
      <div className={styles.content}>{children}</div>
    </div>
  );
}

/** The animated success badge — burst ring + pop-in checkmark. */
export function SuccessBadge() {
  return (
    <div className={styles.badgeWrap}>
      <span className={styles.burstRing} aria-hidden />
      <div className={styles.badge}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 13l4 4L19 7"
            stroke="white"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.checkPath}
          />
        </svg>
      </div>
    </div>
  );
}
