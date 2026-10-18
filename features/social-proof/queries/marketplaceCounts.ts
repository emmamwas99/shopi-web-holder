/**
 * The homepage's social-proof figures: how many sellers have a live shop and
 * how many listings buyers can open right now.
 *
 * Both are counted by the API's public-listing rule (live, public, owner not
 * suspended), so they never include drafts, hidden posts or signups:
 *   - sellers  — `stores.total`, sellers with a visible listing and a @handle
 *   - listings — `publicListingCount`
 *
 * Two requests rather than one document, so an API that doesn't serve
 * `publicListingCount` yet still yields the seller count. Plain fetch rather
 * than the Apollo RSC client keeps the homepage statically generated on the
 * same daily clock as the rest of its data.
 */
import { SOCIAL_PROOF_REVALIDATE_SECONDS } from "./socialProofSellers";

export type MarketplaceCounts = { sellers: number | null; listings: number | null };

async function fetchCount(query: string, pick: (data: unknown) => unknown): Promise<number | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  try {
    const response = await fetch(`${apiUrl}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      next: { revalidate: SOCIAL_PROOF_REVALIDATE_SECONDS, tags: ["social-proof"] },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { data?: unknown };
    const value = payload.data ? pick(payload.data) : null;
    return typeof value === "number" ? value : null;
  } catch {
    return null;
  }
}

/** Best-effort: each figure is null when it can't be read, and is left out. */
export async function fetchMarketplaceCounts(): Promise<MarketplaceCounts> {
  const [sellers, listings] = await Promise.all([
    fetchCount(
      "query HomeSellerCount { stores(input: { limit: 1 }) { total } }",
      (data) => (data as { stores?: { total?: unknown } | null }).stores?.total,
    ),
    fetchCount(
      "query HomeListingCount { publicListingCount }",
      (data) => (data as { publicListingCount?: unknown }).publicListingCount,
    ),
  ]);
  return { sellers, listings };
}

/**
 * A count as the homepage shows it: compact and rounded down, with a "+"
 * whenever rounding dropped something, so the figure is never more than the
 * real one. 87 → "87", 344 → "340+", 1662 → "1.6k+", 10450 → "10k+",
 * 1250000 → "1.2M+". Integer maths throughout, so 1100 stays exactly "1.1k".
 */
export function countLabel(total: number): string {
  let shown: number;
  let label: string;
  if (total < 100) {
    shown = total;
    label = String(total);
  } else if (total < 1_000) {
    shown = Math.floor(total / 10) * 10;
    label = String(shown);
  } else if (total < 10_000) {
    const tenths = Math.floor(total / 100);
    shown = tenths * 100;
    label = `${tenths / 10}k`;
  } else if (total < 1_000_000) {
    const thousands = Math.floor(total / 1_000);
    shown = thousands * 1_000;
    label = `${thousands}k`;
  } else {
    const tenths = Math.floor(total / 100_000);
    shown = tenths * 100_000;
    label = `${tenths / 10}M`;
  }
  return shown < total ? `${label}+` : label;
}
