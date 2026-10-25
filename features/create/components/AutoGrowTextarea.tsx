"use client";

import { useLayoutEffect, useRef, type ComponentProps } from "react";

/**
 * A textarea that grows with what's typed instead of scrolling inside a fixed
 * box, so a long answer ("sunroof, leather seats, reverse camera, …") stays
 * readable. Past `maxHeight` it scrolls.
 */
export function AutoGrowTextarea({
  maxHeight = 320,
  value,
  ...props
}: ComponentProps<"textarea"> & { maxHeight?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    // scrollHeight leaves out the border, which border-box sizing counts.
    const border = el.offsetHeight - el.clientHeight;
    const nextHeight = Math.min(el.scrollHeight + border, maxHeight);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY =
      el.scrollHeight + border > maxHeight ? "auto" : "hidden";
  }, [value, maxHeight]);

  return <textarea ref={ref} value={value} {...props} />;
}
