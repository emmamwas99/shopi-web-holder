"use client";

interface Props {
  amount: number;
  currency: string;
  negotiable: boolean;
  inverted?: boolean; // white pill on dark bg (video overlay)
}

/**
 * The price as text, without any of the pill chrome.
 *
 * Exported because the immersive viewer's mobile overlay renders the price as
 * large display type rather than a pill, and a second copy of this formatting
 * would be free to drift from the pill's — same listing, two different numbers
 * depending on the surface.
 */
export function priceLabel(amount: number, currency: string): string {
  return amount === 0 ? "Free" : `${currency} ${amount.toLocaleString()}`;
}

export function PriceTag({ amount, currency, negotiable, inverted }: Props) {
  const display = priceLabel(amount, currency);

  if (inverted) {
    return (
      <span className="inline-flex items-center gap-1 bg-black/60  text-white text-xs font-bold px-2.5 py-1 rounded-full">
        {display}
        {negotiable && <span className="text-xs opacity-75">· neg</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full">
      {display}
      {negotiable && <span className="text-xs opacity-80">· neg</span>}
    </span>
  );
}
