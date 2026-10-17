"use client";

import { useCallback, useMemo, useRef } from "react";

function newKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Idempotency keys for `createDraft` (the API's `clientRequestId`).
 *
 * A key belongs to one "start a post" action and is resent with every repeat
 * of it: a double tap, or tapping again after a request that timed out but did
 * reach the API. The API answers a repeated key with the draft it already made,
 * so the seller never ends up with duplicate drafts eating into their limit.
 *
 * Keys are per kind ("image", "video", …), so switching from Photos to Video
 * after a failure starts a different draft. `done(kind)` drops the key once its
 * draft is in hand, so the next post from the same screen gets a fresh one.
 */
export function useDraftRequestKeys() {
  const keys = useRef(new Map<string, string>());

  const get = useCallback((kind: string) => {
    let key = keys.current.get(kind);
    if (!key) {
      key = newKey();
      keys.current.set(kind, key);
    }
    return key;
  }, []);

  const done = useCallback((kind: string) => {
    keys.current.delete(kind);
  }, []);

  return useMemo(() => ({ get, done }), [get, done]);
}
