import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  InMemoryCache,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";

const GRAPHQL_URL = `${process.env.NEXT_PUBLIC_API_URL}/graphql`;

type FeedItem = { __ref?: string; id?: string };
type FeedPage = { items?: FeedItem[] } & Record<string, unknown>;

const itemKey = (item: FeedItem) => item.__ref ?? item.id;

/**
 * Field policy shared by every cursor-paginated feed (forYouFeed,
 * followingFeed, localFeed). Cursor args paginate a single list; they should
 * not identify separate cache entries. Page-1 refreshes preserve the already
 * accumulated tail so revisiting a cached feed cannot collapse the scrollable
 * window back to the first page.
 */
const feedFieldPolicy = {
  // `limit` and `after` only paginate — they don't identify a distinct list.
  // localFeed additionally keys on the selected location/radius so each nearby
  // search is its own cached list. Apollo ignores key names that a field does
  // not accept.
  keyArgs: ["seed", "latitude", "longitude", "radiusKm", "county", "subregion"] as const,
  merge(
    existing: FeedPage | undefined,
    incoming: FeedPage,
    { args }: { args: Record<string, unknown> | null },
  ) {
    const incomingItems = incoming.items ?? [];
    const existingItems = existing?.items ?? [];

    if (!args?.after) {
      if (existingItems.length === 0) return { ...incoming, items: incomingItems };

      if (existingItems.length <= incomingItems.length) {
        return { ...incoming, items: incomingItems };
      }

      const existingKeys = new Set(existingItems.map(itemKey));
      const newItems = incomingItems.filter((item) => {
        const key = itemKey(item);
        return !key || !existingKeys.has(key);
      });

      return {
        ...incoming,
        pageInfo: existing?.pageInfo ?? incoming.pageInfo,
        items: [...existingItems, ...newItems],
      };
    }

    const existingKeys = new Set(existingItems.map(itemKey));
    const nextItems = incomingItems.filter(
      (item) => !existingKeys.has(itemKey(item)),
    );

    return {
      ...incoming,
      items: [...existingItems, ...nextItems],
    };
  },
};

// Used by Server Components via getClient() / query() / PreloadQuery
// Each request gets a fresh client instance (registerApolloClient handles this)
export const { getClient, query, PreloadQuery } = registerApolloClient(() => {
  return new ApolloClient({
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            forYouFeed: feedFieldPolicy,
            followingFeed: feedFieldPolicy,
            localFeed: feedFieldPolicy,
          },
        },
      },
    }),
    defaultOptions: {
      query: { errorPolicy: "all" },
      mutate: { errorPolicy: "all" },
    },
    link: new HttpLink({
      uri: GRAPHQL_URL,
      fetchOptions: {
        // Default: hourly, matching the `revalidate` the ISR pages declare.
        // The shortest fetch revalidate in a route sets how often the WHOLE
        // route regenerates, so this default used to be the real interval:
        // at 30s, every "hourly" listing, profile and SEO landing page was
        // rebuilt every 30 seconds, burning Vercel ISR writes and function
        // invocations for no visible gain. Pages needing fresher data opt in:
        // query(MY_QUERY, { context: { fetchOptions: { next: { revalidate: 30 } } } })
        next: { revalidate: 3600 },
      },
    }),
  });
});
