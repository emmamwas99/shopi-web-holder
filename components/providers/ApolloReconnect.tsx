"use client";

import { useEffect, useRef } from "react";
import { useApolloClient } from "@apollo/client/react";
import { useOffline } from "next/offline";

/** Both reconnect signals usually fire within a second or two of each other. */
const DEDUPE_MS = 3000;

/**
 * Re-runs the GraphQL queries that failed while the device was offline.
 *
 * Next's offline mode retries its own requests (navigations, prefetches) once
 * the connection returns, but the feed, listings, profiles and chat come from
 * Apollo. Apollo's RetryLink gives up after about 20 seconds, so a query that
 * failed during a longer outage stayed in its error state until a reload.
 *
 * Only queries currently in an error state are refetched. A query showing
 * data is left alone, so a paginated feed keeps every page it already loaded,
 * and nothing is re-requested that didn't fail. Mutations are never replayed.
 */
export function ApolloReconnect() {
  const client = useApolloClient();
  const isOffline = useOffline();
  const wasOffline = useRef(false);
  const lastRun = useRef(0);

  useEffect(() => {
    const refetchFailed = () => {
      const now = Date.now();
      if (now - lastRun.current < DEDUPE_MS) return;
      lastRun.current = now;
      for (const query of client.getObservableQueries("active")) {
        if (query.getCurrentResult().error) {
          // A failed retry lands back in the query's own error state.
          query.refetch().catch(() => {});
        }
      }
    };

    // useOffline() goes back to false once Next confirms the server is
    // reachable again — the more reliable signal.
    if (isOffline) {
      wasOffline.current = true;
    } else if (wasOffline.current) {
      wasOffline.current = false;
      refetchFailed();
    }

    // The browser's own event covers an outage Next never saw: one where only
    // Apollo was fetching, with no navigation or prefetch to fail.
    window.addEventListener("online", refetchFailed);
    return () => window.removeEventListener("online", refetchFailed);
  }, [client, isOffline]);

  return null;
}
