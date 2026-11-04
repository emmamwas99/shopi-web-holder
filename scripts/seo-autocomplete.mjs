/**
 * Google autocomplete harvester for Kenyan keyword research.
 *
 *   npm run seo:keywords -- docs/seo-audit/seeds/marketplace.txt out.json
 *   npm run seo:keywords -- docs/seo-audit/seeds/tiktok.txt out.json --gl=ke --hl=en
 *
 * Each seed (one per line, "#" for comments) is queried bare and with " a"…" z"
 * appended, the way the October car research and the November marketplace and
 * TikTok research were done (docs/seo-audit/keyword-map.md). The output is
 * every distinct suggestion with:
 *   - count: how many of the queries surfaced it — breadth, a rough signal of
 *     how many ways people reach that phrase;
 *   - rel:   Google's relevance score for its best position.
 * Neither is search volume. Autocomplete shows what people type, not how
 * often; check the clusters against Search Console before betting on one.
 *
 * About 27 requests per seed at 4 at a time, with a short pause between, so a
 * 50-seed list takes a few minutes. It's an unofficial endpoint: keep runs
 * occasional and never put it in CI.
 */
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")),
);
const [seedsFile, outFile] = args.filter((a) => !a.startsWith("--"));
if (!seedsFile || !outFile) {
  console.error("usage: npm run seo:keywords -- <seeds.txt> <out.json> [--gl=ke] [--hl=en]");
  process.exit(1);
}
const gl = flags.gl ?? "ke";
const hl = flags.hl ?? "en";

const seeds = readFileSync(seedsFile, "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

const queries = seeds.flatMap((seed) => [
  { seed, q: seed },
  ..."abcdefghijklmnopqrstuvwxyz".split("").map((l) => ({ seed, q: `${seed} ${l}` })),
]);

const results = new Map();
let failed = 0;

async function ask(q) {
  const url = `https://suggestqueries.google.com/complete/search?client=chrome&hl=${hl}&gl=${gl}&q=${encodeURIComponent(q)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 4_000 * (attempt + 1)));
        continue;
      }
      // The endpoint answers in Latin-1 for some locales.
      const json = JSON.parse(Buffer.from(await res.arrayBuffer()).toString("latin1"));
      const suggestions = json[1] ?? [];
      const relevance = json[4]?.["google:suggestrelevance"] ?? [];
      return suggestions.map((s, i) => ({ s, rel: relevance[i] ?? 0 }));
    } catch {
      await new Promise((r) => setTimeout(r, 1_500));
    }
  }
  failed++;
  return [];
}

let next = 0;
async function worker() {
  while (next < queries.length) {
    const { seed, q } = queries[next++];
    for (const { s, rel } of await ask(q)) {
      const key = s.toLowerCase().trim();
      const row = results.get(key) ?? { count: 0, rel: 0, seeds: new Set() };
      row.count++;
      row.rel = Math.max(row.rel, rel);
      row.seeds.add(seed);
      results.set(key, row);
    }
    await new Promise((r) => setTimeout(r, 120));
  }
}
await Promise.all(Array.from({ length: 4 }, worker));

const rows = [...results]
  .map(([s, row]) => ({ s, count: row.count, rel: row.rel, seeds: [...row.seeds] }))
  .sort((a, b) => b.count - a.count || b.rel - a.rel);
writeFileSync(outFile, JSON.stringify(rows, null, 1));
console.log(
  `${queries.length} queries (${failed} failed), ${rows.length} distinct suggestions → ${outFile}`,
);
