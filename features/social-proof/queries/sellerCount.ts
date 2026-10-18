/**
 * How many sellers have a live shop on Shopi, for the homepage's social proof.
 *
 * Reads `total` from the public Stores directory: sellers with at least one
 * listing a logged-out visitor can open, and a @handle to link to. That makes
 * it a count of shops a buyer could actually visit, never signups.
 *
 * Plain fetch rather than the Apollo RSC client, so the homepage stays
 * statically generated and revalidates on the same daily clock as the rest of
 * its data (see SOCIAL_PROOF_REVALIDATE_SECONDS).
 */
import { SOCIAL_PROOF_REVALIDATE_SECONDS } from "./socialProofSellers";

const SELLER_COUNT = `
  query HomeSellerCount {
    stores(input: { limit: 1 }) {
      total
    }
  }
`;

/** Best-effort: null when the API is unreachable, and the section hides. */
export async function fetchSellerCount(): Promise<number | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  try {
    const response = await fetch(`${apiUrl}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: SELLER_COUNT }),
      next: { revalidate: SOCIAL_PROOF_REVALIDATE_SECONDS, tags: ["social-proof"] },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      data?: { stores?: { total?: number } | null };
    };
    const total = payload.data?.stores?.total;
    return typeof total === "number" ? total : null;
  } catch {
    return null;
  }
}

/**
 * The count as it is shown: rounded down to a tidy figure with a "+", so the
 * number is never more than the real one ("344" → "340+"). Small counts are
 * shown exactly.
 */
export function sellerCountLabel(total: number, locale: string): string {
  if (total < 100) return total.toLocaleString(locale);
  const step = total < 1000 ? 10 : total < 10000 ? 100 : 1000;
  return `${(Math.floor(total / step) * step).toLocaleString(locale)}+`;
}
