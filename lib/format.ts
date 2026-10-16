/**
 * Compact number formatting shared across the app.
 * `1_500 → "1.5K"`, `2_300_000 → "2.3M"`, anything below 1K is left as-is.
 */
export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * A listing's asking price as text ("KES 30,000"), or null when the seller
 * stated none.
 *
 * An amount of 0 is not "free". The composer starts every draft with
 * `isFree: true` and no price, so 0 overwhelmingly means the seller left the
 * field blank — none of the eight zero-priced listings in a sample of the 300
 * newest (Oct 2026) was actually free; they included a used phone, paid hair
 * braiding and a training course. Callers choose how to say "no price": the
 * listing page and feed cards show "Price on request", while titles, meta
 * descriptions and structured data say nothing rather than claim a price.
 */
export function listingPriceText(
  price: { amount: number; currency: string } | null | undefined,
): string | null {
  if (!price || !(price.amount > 0)) return null;
  return `${price.currency} ${price.amount.toLocaleString("en-KE")}`;
}
