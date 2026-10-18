import type { Metadata } from "next";

/**
 * Head tags for every not-found.tsx. Next adds a noindex to 404 responses on
 * its own, but the root layout's robots metadata ("index, follow") would still
 * be emitted beside it; replacing it here leaves one unambiguous directive.
 * The layout's title template turns the title into "Page not found | Shopi".
 *
 * Its own module because NotFoundView is a client component, and a plain
 * object exported from a "use client" file can't be read on the server.
 */
export const NOT_FOUND_METADATA: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};
