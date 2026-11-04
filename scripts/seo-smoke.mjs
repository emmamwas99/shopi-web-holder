/**
 * Crawl-facing smoke test for a running Shopi site — production or a local
 * `next start`. It checks the invariants the October 2026 SEO audit fixed or
 * relies on (docs/seo-audit), against the raw HTML a non-JS crawler receives.
 *
 *   npm run seo:smoke                              # https://www.shopi.co.ke
 *   npm run seo:smoke -- http://localhost:3000     # any other base URL
 *   npm run seo:smoke -- --listings=10             # sample more listings
 *
 * Exits 1 if any check fails. "warn" lines are worth a look but don't fail.
 *
 * It sends a normal mobile-browser user agent. Testing as Googlebot from a
 * non-Google IP proves nothing — a CDN that verifies bots will (correctly)
 * block the fake — so crawler access is checked with Search Console's URL
 * Inspection instead (see docs/seo-audit/monitoring-plan.md).
 */

const args = process.argv.slice(2);
const base = (
  args.find((arg) => !arg.startsWith("--")) ?? "https://www.shopi.co.ke"
).replace(/\/$/, "");
const listingSample = Number(
  args.find((arg) => arg.startsWith("--listings="))?.split("=")[1] ?? 5,
);
const UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";

let failures = 0;
const pass = (msg) => console.log(`  ok    ${msg}`);
const warn = (msg) => console.log(`  warn  ${msg}`);
const fail = (msg) => {
  failures += 1;
  console.log(`  FAIL  ${msg}`);
};
/** Reports every problem as a failure, or a single pass when there are none. */
const report = (label, problems) => {
  const found = problems.filter(Boolean);
  if (found.length) found.forEach((problem) => fail(`${label} ${problem}`));
  else pass(label);
};

const pathOf = (url) => url.replace(/^https?:\/\/[^/]+/, "");

async function get(path) {
  const res = await fetch(path.startsWith("http") ? path : `${base}${path}`, {
    redirect: "manual",
    headers: { "user-agent": UA },
  });
  return { res, body: await res.text() };
}

/** The handful of tags a crawler reads, from raw HTML. */
function parse(html) {
  const headEnd = html.indexOf("</head>");
  const head = headEnd === -1 ? html : html.slice(0, headEnd);
  const all = (re, text = html) => [...text.matchAll(re)].map((m) => m[1]);
  const blobs = all(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g).map(
    (raw) => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
  );
  return {
    canonicals: all(/<link rel="canonical" href="([^"]*)"/g, head),
    robots: all(/<meta name="robots" content="([^"]*)"/g),
    h1s: all(/<h1[^>]*>([\s\S]*?)<\/h1>/g),
    listingLinks: new Set(all(/href="(\/[a-z]{2}\/content\/[^"?#]+)"/g)),
    unparsableJsonLd: blobs.filter((blob) => blob === null).length,
    nodes: blobs.filter(Boolean).flatMap((blob) => (Array.isArray(blob) ? blob : [blob])),
  };
}

async function checkRobots() {
  console.log("robots.txt");
  const { res, body } = await get("/robots.txt");
  if (res.status !== 200) return fail(`robots.txt answered ${res.status}`);
  pass("robots.txt answers 200");

  // Group the file by User-agent so each bot's rules can be read on their own.
  const groups = body.split(/^(?=User-agent:)/im).map((group) => ({
    agent: /^User-agent:\s*(.+)$/im.exec(group)?.[1].trim() ?? "",
    blocksAll: /^Disallow:\s*\/\s*$/im.test(group),
  }));
  if (groups.some((g) => g.agent === "*" && g.blocksAll))
    fail("the * group disallows the whole site");
  // A CDN can rewrite robots.txt — Cloudflare's managed AI-crawler rules do.
  for (const g of groups.filter((g) => g.agent !== "*" && g.blocksAll))
    warn(`${g.agent} is disallowed site-wide — confirm that is the intended policy`);

  for (const sitemap of ["/sitemap.xml", "/sellers/sitemap.xml", "/video-sitemap.xml"]) {
    if (body.includes(`Sitemap: ${base}${sitemap}`)) pass(`lists ${sitemap}`);
    else warn(`doesn't list ${base}${sitemap} (expected when testing a non-production URL)`);
  }
}

async function checkSitemap() {
  console.log("sitemap.xml");
  const { res, body } = await get("/sitemap.xml");
  if (res.status !== 200 || !body.includes("<urlset")) {
    fail(`sitemap.xml answered ${res.status}${body.includes("<urlset") ? "" : " without a <urlset>"}`);
    return [];
  }
  const entries = [...body.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: /<loc>([^<]*)<\/loc>/.exec(m[1])?.[1] ?? "",
    hasLastmod: m[1].includes("<lastmod>"),
  }));
  const count = (re) => entries.filter((e) => re.test(pathOf(e.loc))).length;
  pass(
    `${entries.length} URLs: ${count(/\/content\//)} listings, ${count(/\/video\//)} video watch pages, ${count(/\/explore\/[^/]+\/[^/]+/)} category pages, ${count(/\/@/)} profiles`,
  );

  const hosts = new Set(entries.map((e) => new URL(e.loc).origin));
  if (hosts.size !== 1) fail(`sitemap mixes hosts: ${[...hosts].join(", ")}`);
  if (entries.some((e) => /\/for-you$/.test(e.loc)))
    fail("lists /for-you, which redirects desktop crawlers to /explore");
  // Pages whose lastmod is a real date: listings and their video watch pages
  // (the listing's updatedAt), profiles (newest listing) and blog posts.
  const undated = /\/(content|video|@|blog)/;
  const stamped = entries.filter((e) => e.hasLastmod && !undated.test(pathOf(e.loc)));
  if (stamped.length)
    warn(`${stamped.length} non-listing URLs carry a lastmod — is it a real modification date?`);
  // Profiles belong to /sellers/sitemap.xml alone: listed in both, each file
  // gave the same URL a different lastmod (audit F29).
  if (count(/\/@/)) fail(`lists ${count(/\/@/)} profiles; they belong in /sellers/sitemap.xml only`);
  return entries.map((e) => e.loc);
}

/**
 * Whether the sitemap reaches every listing: the homepage shows the live
 * listing count rounded down ("1.6k+"), so a complete sitemap lists at least
 * that many. The listing walk can drop listings silently (a time budget, a
 * category filter), and this is the only place that would show it.
 */
async function checkListingCoverage(urls) {
  const { res, body } = await get("/en");
  if (res.status !== 200) return;
  const shown = /<dt[^>]*>live listings<\/dt><dd[^>]*>([\d.]+)(k|m)?\+?<\/dd>/i.exec(body);
  if (!shown) return warn("homepage shows no live-listing count to compare the sitemap with");
  const floor = Number(shown[1]) * (shown[2] === "k" ? 1_000 : shown[2] === "m" ? 1_000_000 : 1);
  const listed = urls.filter((url) => url.includes("/content/")).length;
  if (listed >= floor * 0.9) pass(`${listed} listings in the sitemap, homepage shows ${shown[0].match(/>([^<]*)<\/dd>/)[1]}`);
  else fail(`only ${listed} listings in the sitemap, but the homepage counts at least ${floor} live listings`);
}

async function checkSellersSitemap() {
  console.log("sellers/sitemap.xml");
  const { res, body } = await get("/sellers/sitemap.xml");
  if (res.status !== 200 || !body.includes("<urlset"))
    return fail(`sellers/sitemap.xml answered ${res.status}`);
  const locs = [...body.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  const notProfiles = locs.filter((loc) => !/\/@[^/]+$/.test(loc));
  report(`${locs.length} seller profiles`, [
    notProfiles.length > 0 && `includes ${notProfiles.length} URLs that aren't /@{username} profiles`,
  ]);
  if (locs[0]) {
    const { res: page } = await get(pathOf(locs[0]));
    if (page.status !== 200) fail(`${pathOf(locs[0])} answered ${page.status}`);
  }
}

/** What Google needs from each video entry, and that the watch pages and thumbnails are really there. */
async function checkVideoSitemap() {
  console.log("video-sitemap.xml");
  const { res, body } = await get("/video-sitemap.xml");
  if (res.status !== 200 || !body.includes("<urlset") || !body.includes("sitemap-video/1.1"))
    return fail(`video-sitemap.xml answered ${res.status} or isn't a video sitemap`);
  const entries = [...body.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => {
    const tag = (name) => new RegExp(`<video:${name}>([\\s\\S]*?)</video:${name}>`).exec(m[1])?.[1];
    return {
      loc: /<loc>([^<]*)<\/loc>/.exec(m[1])?.[1] ?? "",
      thumbnail: tag("thumbnail_loc")?.replace(/&amp;/g, "&"),
      title: tag("title"),
      description: tag("description"),
      media: tag("content_loc") ?? tag("player_loc"),
    };
  });
  const missing = (key) => entries.filter((e) => !e[key]?.trim()).length;
  report(`${entries.length} videos`, [
    missing("thumbnail") && `${missing("thumbnail")} entries without <video:thumbnail_loc>`,
    missing("title") && `${missing("title")} entries without <video:title>`,
    missing("description") && `${missing("description")} entries without <video:description>`,
    missing("media") && `${missing("media")} entries without <video:content_loc> or <video:player_loc>`,
  ]);
  const expiring = entries.filter((e) => /x-expires=|x-signature=/.test(e.thumbnail ?? "")).length;
  if (expiring)
    warn(`${expiring} thumbnails are signed URLs that expire — Google will report them unreachable`);

  const step = Math.max(1, Math.floor(entries.length / 3));
  for (const entry of entries.filter((_, i) => i % step === 0).slice(0, 3)) {
    const label = pathOf(entry.loc);
    const { res: pageRes, body: html } = await get(label);
    const page = parse(html);
    const thumb = entry.thumbnail ? await fetch(entry.thumbnail, { headers: { "user-agent": UA } }) : null;
    report(label, [
      pageRes.status !== 200 && `answered ${pageRes.status}`,
      pageRes.status === 200 &&
        !(page.canonicals.length === 1 && pathOf(page.canonicals[0]) === label) &&
        `canonical is ${JSON.stringify(page.canonicals)} (a watch page must be its own canonical)`,
      pageRes.status === 200 &&
        !page.nodes.some((node) => node["@type"] === "VideoObject") &&
        "has no VideoObject",
      page.robots.some((r) => r.includes("noindex")) && "is noindex",
      thumb && !(thumb.ok && (thumb.headers.get("content-type") ?? "").startsWith("image")) &&
        `thumbnail answered ${thumb.status} ${thumb.headers.get("content-type") ?? ""}`,
    ]);
  }
}

async function checkListing(url) {
  const label = pathOf(url);
  const { res, body } = await get(label);
  if (res.status !== 200) return fail(`${label} answered ${res.status}`);
  const page = parse(body);
  const products = page.nodes.filter((node) => node["@type"] === "Product");
  report(label, [
    !(page.canonicals.length === 1 && pathOf(page.canonicals[0]) === label) &&
      `canonical is ${JSON.stringify(page.canonicals)}`,
    page.robots.some((r) => r.includes("noindex")) && "is noindex",
    page.h1s.length !== 1 && `has ${page.h1s.length} H1s in the HTML (expected 1)`,
    page.unparsableJsonLd > 0 && `has ${page.unparsableJsonLd} unparsable JSON-LD blocks`,
    products.length !== 1 && `has ${products.length} Product nodes (expected 1)`,
    products.some((p) => p.offers && Number(p.offers.price) === 0) &&
      "claims price 0 — an unstated price must not be an Offer",
  ]);
}

async function checkPage(path, expect) {
  const { res, body } = await get(path);
  if (res.status !== expect.status)
    return fail(`${path} answered ${res.status}, expected ${expect.status}`);
  if (expect.status !== 200) return pass(`${path} answers ${expect.status}`);
  const page = parse(body);
  report(`${path} (${page.listingLinks.size} listing links)`, [
    expect.oneH1 && page.h1s.length !== 1 && `has ${page.h1s.length} H1s (expected 1)`,
    expect.minListingLinks &&
      page.listingLinks.size < expect.minListingLinks &&
      `links to fewer than ${expect.minListingLinks} listings in its HTML`,
    expect.indexable && page.robots.some((r) => r.includes("noindex")) && "is noindex",
    expect.selfCanonical &&
      !page.canonicals.some((c) => pathOf(c) === path) &&
      `canonical is ${JSON.stringify(page.canonicals)}`,
  ]);
}

async function main() {
  console.log(`SEO smoke test against ${base}\n`);
  await checkRobots();
  const urls = await checkSitemap();
  await checkListingCoverage(urls);
  await checkSellersSitemap();
  await checkVideoSitemap();

  console.log("listing pages (sampled across the sitemap)");
  const listings = urls.filter((url) => url.includes("/content/"));
  const step = Math.max(1, Math.floor(listings.length / listingSample));
  for (const url of listings.filter((_, i) => i % step === 0).slice(0, listingSample)) {
    await checkListing(url);
  }

  console.log("browse and landing pages");
  await checkPage("/en", { status: 200, oneH1: true, indexable: true, selfCanonical: true });
  await checkPage("/en/explore", { status: 200, oneH1: true, minListingLinks: 1 });
  const browse = urls.find((url) => /\/explore\/[^/]+\/[^/]+$/.test(url));
  if (browse)
    await checkPage(pathOf(browse), {
      status: 200,
      oneH1: true,
      minListingLinks: 1,
      indexable: true,
      selfCanonical: true,
    });
  else warn("no /explore/{category}/{subcategory} pages in the sitemap");

  console.log("errors are real errors");
  await checkPage("/en/content/seo-smoke-no-such-listing-0", { status: 404 });
  await checkPage("/en/explore/seo-smoke-no-such-category/nothing", { status: 404 });
  await checkPage("/en/seo-smoke-no-such-page", { status: 404 });

  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
