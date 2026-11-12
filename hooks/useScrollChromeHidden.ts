"use client";

import { useEffect, useState } from "react";

/** Hide navigation after a deliberate downward scroll; reveal it on the way back. */
export function useScrollChromeHidden(key: string) {
  const [visibility, setVisibility] = useState({ key, hidden: false });

  useEffect(() => {
    let previousScrollY = Math.max(0, window.scrollY);
    let directionDistance = 0;
    let frame = 0;

    const setHidden = (hidden: boolean) => {
      setVisibility((current) =>
        current.key === key && current.hidden === hidden
          ? current
          : { key, hidden },
      );
    };

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const currentScrollY = Math.max(0, window.scrollY);
        const scrollDelta = currentScrollY - previousScrollY;

        if (scrollDelta === 0) return;

        if (
          directionDistance !== 0 &&
          Math.sign(scrollDelta) !== Math.sign(directionDistance)
        ) {
          directionDistance = scrollDelta;
        } else {
          directionDistance += scrollDelta;
        }

        if (currentScrollY <= 24) {
          setHidden(false);
          directionDistance = 0;
        } else if (directionDistance <= -32) {
          setHidden(false);
          directionDistance = 0;
        } else if (currentScrollY > 72 && directionDistance >= 48) {
          setHidden(true);
          directionDistance = 0;
        }

        previousScrollY = currentScrollY;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [key]);

  return visibility.key === key && visibility.hidden;
}
