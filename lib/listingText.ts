/**
 * The minimum a listing's title and description must say — the same floor the
 * API enforces when a listing is published or edited
 * (shopi-social-commerce-api src/utils/listing-text.ts). Checking it here too
 * means the seller hears about it while typing, not after tapping Publish.
 * Keep the two files in step.
 *
 *   - Title: at least 2 words — "Black leather shoes", "Mazda Atenza",
 *     "iPhone 13". A lone "Shoe" is not enough.
 *   - Description: required, at least 30 characters and 5 words — enough for
 *     condition, size and what's included.
 *
 * A "word" is a whitespace-separated token with at least two letters or
 * digits, so a stray "a", "-" or emoji doesn't pad a title to two words.
 */

export const LISTING_TITLE_MIN_WORDS = 2;
export const LISTING_DESCRIPTION_MIN_CHARS = 30;
export const LISTING_DESCRIPTION_MIN_WORDS = 5;

export const LISTING_TEXT_MESSAGES = {
  titleRequired: "Add a title so buyers know what you’re selling.",
  titleTooShort:
    "Make the title more specific: use at least 2 words, like “Black leather shoes” or “Mazda Atenza”.",
  descriptionRequired: "Add a description: the condition, size and what’s included.",
  descriptionTooShort: `Write a description of at least ${LISTING_DESCRIPTION_MIN_CHARS} characters and ${LISTING_DESCRIPTION_MIN_WORDS} words: the condition, size and what’s included.`,
} as const;

/** Trimmed, with runs of whitespace (including line breaks) counted as one. */
function normalized(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/** Tokens with at least two letters or digits. */
export function countListingWords(text: string | null | undefined): number {
  return normalized(text)
    .split(" ")
    .filter((token) => (token.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= 2).length;
}

/** Why a title would be rejected, or null when it's fine. */
export function listingTitleProblem(title: string | null | undefined): string | null {
  if (!normalized(title)) return LISTING_TEXT_MESSAGES.titleRequired;
  if (countListingWords(title) < LISTING_TITLE_MIN_WORDS) {
    return LISTING_TEXT_MESSAGES.titleTooShort;
  }
  return null;
}

/** Why a description would be rejected, or null when it's fine. */
export function listingDescriptionProblem(
  description: string | null | undefined,
): string | null {
  const text = normalized(description);
  if (!text) return LISTING_TEXT_MESSAGES.descriptionRequired;
  if (
    text.length < LISTING_DESCRIPTION_MIN_CHARS ||
    countListingWords(text) < LISTING_DESCRIPTION_MIN_WORDS
  ) {
    return LISTING_TEXT_MESSAGES.descriptionTooShort;
  }
  return null;
}

/** The standing hint under a title field. */
export const LISTING_TITLE_HINT = "At least 2 words, e.g. “Black leather shoes”";

/**
 * The line under a description field while the seller types: how far there is
 * to go, or null once the description clears the floor.
 */
export function descriptionProgressHint(
  description: string | null | undefined,
): string | null {
  const text = normalized(description);
  if (!text) {
    return `At least ${LISTING_DESCRIPTION_MIN_CHARS} characters: condition, size, what’s included.`;
  }
  const left = LISTING_DESCRIPTION_MIN_CHARS - text.length;
  if (left > 0) return `${left} more character${left === 1 ? "" : "s"} to go`;
  if (countListingWords(text) < LISTING_DESCRIPTION_MIN_WORDS) return "Add a few more words.";
  return null;
}

/**
 * For editing a published listing: the problem with each field the seller
 * changed, or null. Unchanged text is left alone, as the API does, so a listing
 * posted before these rules can still have its price edited without being made
 * to rewrite its description first.
 */
export function changedListingTextProblems(
  stored: { title?: string | null; caption?: string | null },
  edited: { title: string; caption: string },
): { title: string | null; description: string | null } {
  const changed = (before: string | null | undefined, after: string) =>
    (before ?? "").trim() !== after.trim();
  return {
    title: changed(stored.title, edited.title) ? listingTitleProblem(edited.title) : null,
    description: changed(stored.caption, edited.caption)
      ? listingDescriptionProblem(edited.caption)
      : null,
  };
}
