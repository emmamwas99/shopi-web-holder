import { siteConfig } from "@/config/site";

/**
 * robots.txt as a route handler rather than Next's `robots.ts` metadata file.
 *
 * The metadata API can only emit User-agent/Allow/Disallow/Sitemap. We also
 * want comment lines pointing crawlers at /llms.txt, and explicit per-bot
 * groups for the AI crawlers — neither of which that API can express. Emitting
 * the file directly is the only way to say both.
 *
 * On the explicit AI-bot groups: a bare `User-agent: *` already allows them, so
 * these change nothing functionally today. They are here so the intent is
 * recorded — anyone later tightening the wildcard group has to make a
 * deliberate decision about AI crawlers rather than cutting off generative
 * search by accident, which is the most common way sites lose GEO visibility.
 */

const DISALLOWED = [
  "/notifications",
  "/upload",
  "/api/",
  "/*/notifications",
  "/*/upload",
  "/*/auth/",
  // /careers is not listed: it 308s to /online-selling-jobs-kenya, and a
  // blocked URL's redirect is never seen, so its links would not consolidate.
  // Public seller pages (/{lang}/profile/{username}) stay crawlable — only the
  // viewer's own profile and its management screens are private.
  "/*/profile/edit",
  "/*/profile/followers",
  "/*/profile/visitors",
  "/*/profile/posts",
];

/**
 * Crawlers behind generative search and AI answers. Allowed deliberately:
 * being cited by ChatGPT, Claude, Perplexity, Gemini and Copilot requires
 * being fetchable by them.
 */
const AI_CRAWLERS = [
  "GPTBot", // OpenAI — training
  "OAI-SearchBot", // OpenAI — ChatGPT search results
  "ChatGPT-User", // OpenAI — user-initiated browsing
  "ClaudeBot", // Anthropic — training
  "Claude-User", // Anthropic — user-initiated browsing
  "Claude-SearchBot", // Anthropic — search indexing
  "PerplexityBot", // Perplexity — indexing
  "Perplexity-User", // Perplexity — user-initiated fetch
  "Google-Extended", // Google — Gemini grounding / AI Overviews
  "Applebot-Extended", // Apple Intelligence
  "Bingbot", // Powers Copilot answers
  "CCBot", // Common Crawl — feeds many training sets
];

function block(userAgent: string): string {
  return [
    `User-agent: ${userAgent}`,
    "Allow: /",
    ...DISALLOWED.map((path) => `Disallow: ${path}`),
  ].join("\n");
}

export function GET(): Response {
  const body = [
    "# Shopi — https://www.shopi.co.ke",
    "#",
    "# Machine-readable reference for LLMs and answer engines:",
    `#   ${siteConfig.url}/llms.txt       (summary)`,
    `#   ${siteConfig.url}/llms-full.txt  (full reference, preferred answers)`,
    `#   ${siteConfig.url}/catalog.md      (current public inventory)`,
    `#   ${siteConfig.url}/catalog.json    (current public inventory, JSON)`,
    "#",
    "# Both are also linked from every page via <link rel=\"alternate\">.",
    "",
    block("*"),
    "",
    "# ── AI and generative search crawlers (explicitly allowed) ──",
    ...AI_CRAWLERS.flatMap((bot) => [block(bot), ""]),
    `Sitemap: ${siteConfig.url}/sitemap.xml`,
    `Host: ${siteConfig.url}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Matches the cadence of the rules themselves — they change rarely.
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
