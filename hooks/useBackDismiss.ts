"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Back closes the sheet on top instead of leaving the page under it.
 *
 * On a phone, Back is how people dismiss things — the gesture, the hardware
 * button, the browser arrow. A sheet that ignores it sends the user off the
 * whole screen. So each open sheet pushes one history entry (same URL), and
 * the popstate that Back causes closes it. Closing any other way — the X,
 * swipe-down, an overlay tap, or code after a save — closes at once and then
 * drops the sheet's entry, so history never keeps a stale step.
 *
 * Unlike the single-overlay version in CommentsDrawer and
 * useOverlayBehaviour, this one stacks: open sheets form a stack and one Back
 * closes only the sheet on top — the edit sheet, then the post sheet under it.
 * Sheets closed together have their entries dropped in one step.
 *
 * `onClose` may return `false` to refuse — an edit sheet with unsaved changes
 * asks first. On Back the entry is then restored, so the sheet stays open and
 * the next Back still belongs to it.
 *
 * Navigating away from inside a sheet should call `release()` first, then
 * `router.replace` when it returns true, so Back from the new page lands on
 * this page instead of on the sheet's leftover entry.
 */

const STATE_KEY = "__shopiSheet";

type Layer = { close: () => void };

/** Open sheets that own a history entry, bottom to top. */
const stack: Layer[] = [];
/** popstate events caused by our own unwinding, which must not close anything. */
let ignoredPops = 0;
/** Entries to drop at the end of the current task. */
let pendingUnwind = 0;
let listening = false;

function onPopState() {
  if (ignoredPops > 0) {
    ignoredPops -= 1;
    return;
  }
  stack.pop()?.close();
}

function pushEntry() {
  if (!listening) {
    window.addEventListener("popstate", onPopState);
    listening = true;
  }
  window.history.pushState(
    { ...(window.history.state ?? {}), [STATE_KEY]: true },
    "",
  );
}

function removeLayer(layer: Layer) {
  const index = stack.indexOf(layer);
  if (index !== -1) stack.splice(index, 1);
}

/**
 * Drop entries left by sheets that closed without Back, batched so closing
 * two at once is a single `history.go(-2)` — two back() calls in one task are
 * not reliably both honoured.
 */
function scheduleUnwind() {
  pendingUnwind += 1;
  if (pendingUnwind > 1) return;
  queueMicrotask(() => {
    const count = pendingUnwind;
    pendingUnwind = 0;
    // Only while the entry on screen is still one of ours. If a navigation
    // has been pushed over it, going back would undo that navigation.
    const state = window.history.state as Record<string, unknown> | null;
    if (!state?.[STATE_KEY]) return;
    ignoredPops += 1;
    window.history.go(-count);
  });
}

export function useBackDismiss(
  open: boolean,
  onClose: () => boolean | void,
) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const controls = useRef<{ requestClose: () => void; release: () => boolean }>({
    requestClose: () => void onCloseRef.current(),
    release: () => false,
  });

  useEffect(() => {
    if (!open) return;

    let pushed = false;
    // Its entry is already gone (Back) or handed to a navigation (release).
    let finished = false;

    const layer: Layer = {
      close: () => {
        finished = true;
        if (onCloseRef.current() === false) {
          // Refused: put the entry back so the sheet still owns the next Back.
          pushEntry();
          stack.push(layer);
          finished = false;
        }
      },
    };

    // Deferred a tick so Strict Mode's throwaway effect pass can't push an
    // entry and immediately pop it.
    const timer = window.setTimeout(() => {
      pushEntry();
      pushed = true;
      stack.push(layer);
    }, 0);

    controls.current = {
      // Close now; the cleanup below drops the entry once `open` flips.
      requestClose: () => void onCloseRef.current(),
      release: () => {
        window.clearTimeout(timer);
        removeLayer(layer);
        finished = true;
        return pushed;
      },
    };

    return () => {
      window.clearTimeout(timer);
      removeLayer(layer);
      if (pushed && !finished) scheduleUnwind();
      controls.current = {
        requestClose: () => void onCloseRef.current(),
        release: () => false,
      };
    };
  }, [open]);

  const requestClose = useCallback(() => controls.current.requestClose(), []);
  const release = useCallback(() => controls.current.release(), []);
  return { requestClose, release };
}
