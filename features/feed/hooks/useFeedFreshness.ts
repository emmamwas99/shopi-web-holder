"use client";

import { useApolloClient } from "@apollo/client/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ForYouFeedDocument,
  type ContentCardFieldsFragment,
} from "@/types/__generated__/graphql";
import { FEED_PAGE_SIZE } from "../constants";
import {
  FEED_RESUME_CHECK_MS,
  FOR_YOU_REFRESH_EVENT,
  hasNewListings,
} from "@/lib/feedFreshness";
import { cancelScrollRestore } from "@/lib/scrollRestoration";

interface Options {
  active: boolean;
  seed: string;
  latitude?: number;
  longitude?: number;
  items: readonly ContentCardFieldsFragment[];
  onRefresh: (seed: string) => void;
}

/** Check separately from the displayed Apollo stream; only an explicit refresh replaces it. */
export function useFeedFreshness({
  active,
  seed,
  latitude,
  longitude,
  items,
  onRefresh,
}: Options) {
  const apollo = useApolloClient();
  const scope = JSON.stringify([seed, latitude, longitude]);
  const current = useRef({ active, scope, items });
  const revision = useRef(0);
  const lastCheckedAt = useRef(0);
  const refreshing = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notice, setNotice] = useState({ scope, available: false });

  useEffect(() => {
    current.current = { active, scope, items };
    if (lastCheckedAt.current === 0) lastCheckedAt.current = Date.now();
  }, [active, scope, items]);

  useEffect(
    () => () => {
      current.current.active = false;
    },
    [],
  );

  useEffect(() => {
    revision.current += 1;
    return () => { revision.current += 1; };
  }, [active, scope]);

  const readHead = useCallback(
    (headSeed: string) =>
      apollo.query({
        query: ForYouFeedDocument,
        variables: {
          limit: FEED_PAGE_SIZE,
          latitude,
          longitude,
          seed: headSeed,
        },
        // A probe must neither reorder cards nor advance the displayed list's cursor.
        fetchPolicy: "no-cache",
        errorPolicy: "none",
        context: { fetchOptions: { cache: "no-store" } },
      }),
    [apollo, latitude, longitude],
  );

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let checking = false;
    const check = async () => {
      if (
        disposed ||
        checking ||
        refreshing.current ||
        !navigator.onLine ||
        document.visibilityState !== "visible" ||
        document.body.classList.contains("comments-open") ||
        Date.now() - lastCheckedAt.current < FEED_RESUME_CHECK_MS
      )
        return;

      checking = true;
      lastCheckedAt.current = Date.now();
      try {
        const { data } = await readHead(seed);
        if (
          disposed ||
          !data ||
          current.current.scope !== scope ||
          !current.current.active
        )
          return;
        setNotice({
          scope,
          available: hasNewListings(
            current.current.items,
            data.forYouFeed.items,
          ),
        });
      } catch {
        // A failed background check leaves the current feed usable.
      } finally {
        checking = false;
      }
    };

    void check();
    // Recheck only on a user/lifecycle event. No timers or periodic requests.
    const onResume = () => {
      void check();
    };
    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("focus", onResume);
    window.addEventListener("online", onResume);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("focus", onResume);
      window.removeEventListener("online", onResume);
    };
  }, [active, readHead, scope, seed]);

  const refresh = useCallback(async () => {
    if (refreshing.current || !current.current.active) return;
    refreshing.current = true;
    const startedAtRevision = revision.current;
    setIsRefreshing(true);
    // A distinct client cache entry avoids merging a fresh head into the old tail.
    // The API hashes arbitrary seeds into its bounded set of shared variants.
    const nonce =
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const nextSeed = `refresh-${nonce}`;
    try {
      const { data } = await readHead(nextSeed);
      if (!data || current.current.scope !== scope || !current.current.active || revision.current !== startedAtRevision)
        return;
      apollo.writeQuery({
        query: ForYouFeedDocument,
        variables: {
          limit: FEED_PAGE_SIZE,
          latitude,
          longitude,
          seed: nextSeed,
        },
        data,
        overwrite: true,
      });
      lastCheckedAt.current = Date.now();
      setNotice({ scope, available: false });
      cancelScrollRestore();
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      onRefresh(nextSeed);
    } catch {
      if (current.current.active && current.current.scope === scope) {
        toast.error("Couldn't refresh your feed. Please try again.");
      }
    } finally {
      refreshing.current = false;
      setIsRefreshing(false);
    }
  }, [apollo, latitude, longitude, onRefresh, readHead, scope]);

  useEffect(() => {
    if (!active) return;
    const onRefresh = () => {
      void refresh();
    };
    window.addEventListener(FOR_YOU_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(FOR_YOU_REFRESH_EVENT, onRefresh);
  }, [active, refresh]);

  return {
    hasNewListings: notice.scope === scope && notice.available,
    isRefreshing,
    refresh,
  };
}
