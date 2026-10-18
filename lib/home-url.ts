/**
 * Where the Shopi logo goes: the public homepage, for everyone.
 *
 * The proxy sends signed-in visitors on "/{lang}" to the feed, so a bare
 * "/{lang}" logo link lands them in the app instead of on the homepage.
 * `?view=home` opts out of that redirect. The homepage canonicalises to
 * "/{lang}", so the query never becomes a second indexed URL.
 *
 * For the logo and "Shopi homepage" links only. Breadcrumbs and structured
 * data keep the canonical "/{lang}".
 */
export function homeHref(lang: string): string {
  return `/${lang}?view=home`;
}
