/**
 * Precompute a die-cut path for every library logo art (every style × icon/wordmark × light/dark, deduped by URL), so
 * pages can draw real stickers without rasterising in the browser. Fixes come from src/lib/stickers/overrides.ts (and
 * the review page's overrides.review.json), per logo and per file.
 *
 * Run:   ./node_modules/.bin/vite-node scripts/build-cuts.ts                     → rebuild src/lib/stickers/cuts.json
 *        ./node_modules/.bin/vite-node scripts/build-cuts.ts -- --only a.svg,b.svg   → just those files, rest kept
 */
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LOGOS, logoArts } from "../src/lib/stickers/logos";
import { buildFor } from "../src/lib/stickers/overrides";
import { buildCut, resvgRasterizer } from "../src/lib/stickers/cut-build";
import type { CutEntry } from "../src/lib/stickers/cuts-types";

const OUT = "src/lib/stickers/cuts.json";
const only = (() => {
  const i = process.argv.indexOf("--only");
  return i > 0 ? new Set(process.argv[i + 1].split(",").filter(Boolean)) : null;
})();
const fileOf = (href: string) => href.split("/").pop() ?? href;
const rasterize = resvgRasterizer(Resvg);

/** art href → its logo key (LOGOS already has fixed art swapped in) */
const urls = new Map<string, string>();
for (const l of LOGOS) for (const href of logoArts(l)) urls.set(href, l.key);

const out: Record<string, CutEntry> = only ? JSON.parse(readFileSync(OUT, "utf8")) : {};
let n = 0;
for (const [href, key] of urls) {
  if (only && !only.has(fileOf(href))) continue;
  if (/^[a-z]+:/i.test(href)) {
    console.warn("skip remote art", href);
    continue;
  }
  let svg: string;
  try {
    // hrefs are "/library/x.svg" (a few lack the leading slash), served from static/; keyed by the href as-is
    svg = readFileSync(join("static", href), "utf8");
  } catch (e) {
    console.warn("skip", href, (e as Error).message);
    continue;
  }
  const cut = buildCut(svg, buildFor(key, fileOf(href)), rasterize);
  if (!cut) {
    console.warn("skip empty cut", href);
    delete out[href];
    continue;
  }
  out[href] = cut;
  if (++n % 100 === 0) console.log(n, "done");
}
writeFileSync(OUT, JSON.stringify(out));
console.log(only ? `updated ${n} of ${only.size} requested` : `wrote ${Object.keys(out).length} cuts of ${urls.size} arts`);
