"use client";

import type { ReactNode } from "react";
import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  type Variants,
} from "framer-motion";

/**
 * Scroll-in motion for the landing pages: content fades and rises into place
 * the first time it enters the viewport, and grids cascade one item after
 * another. Phones and desktop alike.
 *
 * - <LandingMotion> wraps the page once. It loads framer's small
 *   `domAnimation` feature set (LazyMotion + `m`, not the full `motion`
 *   bundle) and honours the visitor's reduced-motion setting: with it on,
 *   things fade without moving.
 * - <Reveal> animates one block. <RevealGroup> + <RevealItem> stagger a list.
 *   Each renders the tag and className it's given, so it can stand in for the
 *   element it replaces without changing the layout (grid items, md:order…).
 *
 * The server HTML carries the hidden start state (opacity 0) as inline style.
 * Content is still in the HTML for crawlers; the page's <noscript> rule
 * (`[data-reveal]`) shows it when JavaScript is off.
 *
 * Only for content below the fold. Anything visible on load (the hero, its
 * listings board, Browse by category) stays plain: wrapped, it would sit
 * hidden until hydration and then animate in, which reads as a slow page —
 * and the hero H1 is the LCP element, which must paint immediately.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

const ITEM: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

const SCALE: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: EASE } },
};

/** Starts once a little of the block is on screen, a touch above the fold line. */
const VIEWPORT = { once: true, amount: 0.15, margin: "0px 0px -8% 0px" } as const;

const TAGS = {
  div: m.div,
  section: m.section,
  ul: m.ul,
  ol: m.ol,
  li: m.li,
  p: m.p,
  nav: m.nav,
  article: m.article,
  details: m.details,
} as const;

type Tag = keyof typeof TAGS;

type BaseProps = {
  as?: Tag;
  className?: string;
  id?: string;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
  children?: ReactNode;
};

export function LandingMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

/** One block: fades up (or, with `scale`, settles in from slightly smaller). */
export function Reveal({
  as = "div",
  delay = 0,
  scale = false,
  ...props
}: BaseProps & { delay?: number; scale?: boolean }) {
  const Component = TAGS[as] as typeof m.div;
  const variants = scale ? SCALE : ITEM;
  return (
    <Component
      data-reveal=""
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={
        delay
          ? {
              ...variants,
              visible: {
                ...(variants.visible as object),
                transition: { ...(variants.visible as { transition: object }).transition, delay },
              },
            }
          : variants
      }
      {...props}
    />
  );
}

/** A list whose <RevealItem> children cascade in, `stagger` seconds apart. */
export function RevealGroup({
  as = "div",
  stagger = 0.08,
  delay = 0,
  ...props
}: BaseProps & { stagger?: number; delay?: number }) {
  const Component = TAGS[as] as typeof m.div;
  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
      {...props}
    />
  );
}

/** One item of a <RevealGroup>; it takes its timing from the group. */
export function RevealItem({ as = "div", ...props }: BaseProps) {
  const Component = TAGS[as] as typeof m.div;
  return <Component data-reveal="" variants={ITEM} {...props} />;
}
