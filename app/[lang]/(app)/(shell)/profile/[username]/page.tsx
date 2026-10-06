import { permanentRedirect } from "next/navigation";
import { query } from "@/lib/apollo/ApolloClient";
import { GetUserProfileDocument } from "@/types/__generated__/graphql";

/**
 * Legacy profile URL.
 *
 * Profiles moved to `/{lang}/@{username}`. Anything already shared, bookmarked
 * or indexed under `/profile/{id-or-username}` lands here and is sent on
 * permanently, so link equity consolidates on one canonical address rather than
 * splitting across two.
 *
 * Old links carry a raw ObjectId. Redirecting that straight through would mint
 * `/@6a57f98a349f8c0d29a9bfac` — a working page at an address that defeats the
 * point of the move — so an id is resolved to its handle first. If the lookup
 * fails the id still goes through, because the profile route accepts either.
 */
const OBJECT_ID = /^[a-f\d]{24}$/i;

async function handleFor(idOrUsername: string): Promise<string> {
  if (!OBJECT_ID.test(idOrUsername)) return idOrUsername;
  try {
    const { data } = await query({
      query: GetUserProfileDocument,
      variables: { username: idOrUsername },
    });
    return data?.userProfile?.username ?? idOrUsername;
  } catch {
    return idOrUsername;
  }
}

export default async function LegacyProfileRedirect({
  params,
}: {
  params: Promise<{ lang: string; username: string }>;
}) {
  const { lang, username } = await params;
  const handle = await handleFor(username);
  permanentRedirect(`/${lang}/@${encodeURIComponent(handle)}`);
}
