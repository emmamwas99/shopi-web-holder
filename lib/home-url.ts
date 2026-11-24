/**
 * Where the Shopi logo goes: the public homepage, for everyone.
 *
 * Signed-in visitors used to be redirected from "/{lang}" into the app, and
 * logo links carried `?view=home` to get past that. The redirect is gone (the
 * homepage now greets them with a way back in instead), so this is just the
 * canonical homepage. Old `?view=home` links still work; the page ignores it.
 */
export function homeHref(lang: string): string {
  return `/${lang}`;
}
