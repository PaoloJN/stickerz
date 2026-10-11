# Marketing Pages + Sticker Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the six marketing pages (Home, For Brands, Docs, Legal, 404, Support) from the Claude Design mocks on a shared site chrome, and make server-rendered stickers look like die-cut stickers everywhere.

**Architecture:** A build script precomputes one die-cut path per logo art into a server-only JSON; a shared `Sticker.svelte` SVG renderer draws vinyl + logo from it, and `StackLid` uses it. A `src/components/site/` chrome (announcement bar, stats bar with a live GitHub star count, nav, footer, 1120 px frame) replaces `StackHeader`. Pages are plain SvelteKit routes with server loads; docs/legal copy lives in typed data modules; the brand form posts to a JSON endpoint backed by a new Drizzle table.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, Tailwind v4 + shadcn-svelte (`@/components/ui/*`), lucide (`@lucide/svelte/icons/*`), Drizzle + Neon, zod, vitest, `@resvg/resvg-js` (new devDependency, build script only), vite-node.

**Spec:** `docs/superpowers/specs/2026-10-07-marketing-pages-design.md`. Visual source of truth: `docs/design/*.dc.html` (read `docs/design/README.md` first for the token mapping).

## Global Constraints

- Desktop first (1120 px column); do not spend time on phone layouts.
- Semantic colour tokens only (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-muted`, `bg-accent`, `bg-card`, `text-destructive`); no hex colours in markup except inside SVG filters/gradients that are the same in both themes. Every page must look right in dark mode (mode-watcher toggles the `dark` class).
- Use our components: `Button` from `@/components/ui/button` (default = black, `variant="outline"` = white), `Input`, `Textarea`, `Checkbox`, `Accordion`, `ToggleGroup` from `@/components/ui/*` (check `src/components/ui/` for what exists; add via `./node_modules/.bin/shadcn-svelte add <name>` only if missing). Icons from `@lucide/svelte/icons/<name>`.
- Imports: `@/` → `src/`, `$lib/` → `src/lib/`. Runes files that use `$state` etc. must be `.svelte.ts`.
- No new runtime dependencies except `zod` (already present) and `@resvg/resvg-js` (dev only). No animation libraries, no iframes.
- Copy comes from the mocks verbatim unless the spec says to correct it (export formats, laptops, where stacks live, repo URL `https://github.com/PaoloJN/stack-stickers`).
- Commands: `./node_modules/.bin/vitest run`, `./node_modules/.bin/vite build`, `./node_modules/.bin/svelte-check --tsconfig ./tsconfig.json` (pnpm is only reliable for `pnpm db:*`). `vite dev` needs `ulimit -n 10240`; prefer build + `node build/index.js` (PORT env) for smoke tests. Never run broad `pkill` commands; kill by port with `lsof -ti:PORT | xargs kill`.
- Commit after each task with a conventional message ending in `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. **A logo with no precomputed cut** (new svgl sync, failed rasterise, custom upload `@text`/`@upload` stickers): `Sticker.svelte` must draw the rounded-square fallback, never throw or render a broken path. Test in Task 0.
2. **GitHub API down, rate-limited or slow**: every page must still render; the stats bar hides the count chip and the request must not add more than ~2 s to any load, and only once per hour. Test in Task 1.
3. **Brand form abuse / bad input**: a free-mail address for Remove/Update, an unknown logo key, a 20 kB details field, a missing auth checkbox must all be rejected server-side with a 400 and a field map, independent of the client. Test in Task 3.
4. **Unknown docs/legal slug** (`/docs/nope`, `/legal/tm` alias, `/legal/x`): 404 through the error page for unknown, 301/307 redirect for the alias. Test in Tasks 4 and 5.
5. **Gallery empty or DB unset** (`DATABASE_URL` missing in a fresh checkout): Home must still render with the mock stacks and the teaser must not show an empty grid. Test in Task 2.

---

## Task 0: Die-cut paths + `Sticker.svelte` + `StackLid` upgrade

**Files:**
- Create: `scripts/build-cuts.ts`, `src/lib/stickers/cuts.ts`, `src/lib/stickers/cuts.json` (generated, committed), `src/components/stack/Sticker.svelte`, `tests/stickers/cuts.test.ts`
- Modify: `src/components/stack/StackLid.svelte`, `package.json` (script + devDependency), `src/routes/+page.server.ts`, `src/routes/gallery/+page.server.ts`, `src/routes/stacks/+page.server.ts`, `src/routes/stack/[id]/+page.server.ts` and their `+page.svelte` files (pass `cuts`)

**Interfaces:**
- Consumes: `cutPath(a: Alpha, o: CutOpts): string` from `$lib/stickers/cut`; `LOGOS`, `artFor` from `$lib/stickers/logos`; `DEFAULT_STYLE`, `smoothMm` from `$lib/stickers/style`; `Layout` from `$lib/stickers/types`.
- Produces:
  - `export type CutEntry = { d: string; aspect: number }` and `export function cutFor(href: string): CutEntry | null`, `export function cutsFor(hrefs: Iterable<string>): Record<string, CutEntry>`, `export function artUrlsIn(layouts: Layout[]): string[]` in `src/lib/stickers/cuts.ts` (**server-only**: only import from `+page.server.ts` / `+layout.server.ts` / `$lib/server/*`).
  - `Sticker.svelte` props: `{ href: string; cut?: CutEntry | null; x: number; y: number; w: number; rot?: number; shadow?: boolean }` — an SVG `<g>` to be placed inside a parent `<svg>` whose user units are millimetres; `x,y` = centre, `w` = art width in mm.
  - `StackLid.svelte` new prop `cuts?: Record<string, CutEntry>`.
  - A `CutDefs.svelte` is NOT needed: the drop shadow is a CSS `filter: drop-shadow(...)` on the `<g>` (works for SVG in all browsers we care about).

- [ ] **Step 1: Install resvg and add the script**

```bash
./node_modules/.bin/pnpm add -D @resvg/resvg-js || npm i -D @resvg/resvg-js
```
Add to `package.json` scripts: `"build:cuts": "vite-node scripts/build-cuts.ts"`.

- [ ] **Step 2: Write `src/lib/stickers/cuts.ts` (types + lookups) with a failing test**

`tests/stickers/cuts.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { cutFor, cutsFor, artUrlsIn, CANON } from "$lib/stickers/cuts";
import { LOGO_BY_KEY, artFor } from "$lib/stickers/logos";
import { buildLayout, toKeys } from "$lib/stacks/mock";

describe("cuts", () => {
  it("has a well-formed path for common logos", () => {
    for (const key of ["vercel", "react", "figma", "tailwindcss"]) {
      const logo = LOGO_BY_KEY.get(key)!;
      const c = cutFor(artFor(logo, "icon", "light"));
      expect(c, key).not.toBeNull();
      expect(c!.d.startsWith("M")).toBe(true);
      expect(c!.d.length).toBeGreaterThan(20);
      expect(c!.aspect).toBeGreaterThan(0.2);
    }
  });
  it("returns null for unknown art and never throws", () => {
    expect(cutFor("/library/does-not-exist.svg")).toBeNull();
    expect(cutsFor(["/library/does-not-exist.svg"])).toEqual({});
  });
  it("collects the art urls of a layout", () => {
    const layout = buildLayout(toKeys(["vercel", "react"]), "silver", 1);
    const urls = artUrlsIn([layout]);
    expect(urls.length).toBe(2);
    expect(Object.keys(cutsFor(urls)).length).toBe(2);
  });
  it("canonical box is 100mm", () => expect(CANON.artW).toBe(100));
});
```

`src/lib/stickers/cuts.ts`:
```ts
// SERVER-ONLY. Import from +page.server.ts / $lib/server only; cuts.json is ~MBs.
import cuts from "./cuts.json";
import { artFor, LOGO_BY_KEY } from "./logos";
import type { Layout } from "./types";

export type CutEntry = { d: string; aspect: number };
/** canonical box the paths were traced in (mm); scale by w/CANON.artW when drawing */
export const CANON = { artW: 100, margin: 3 } as const;

const table = cuts as Record<string, CutEntry>;

export const cutFor = (href: string): CutEntry | null => table[href] ?? null;

export function cutsFor(hrefs: Iterable<string>): Record<string, CutEntry> {
  const out: Record<string, CutEntry> = {};
  for (const h of hrefs) {
    const c = table[h];
    if (c) out[h] = c;
  }
  return out;
}

export function artUrlsIn(layouts: Layout[]): string[] {
  const set = new Set<string>();
  for (const l of layouts)
    for (const s of l.stickers) {
      const logo = LOGO_BY_KEY.get(s.logo);
      if (logo) set.add(artFor(logo, s.variant, s.theme));
    }
  return [...set];
}
```
Create an empty `src/lib/stickers/cuts.json` (`{}`) so the import resolves before the script runs. Ensure `tsconfig`/SvelteKit allow JSON imports (`resolveJsonModule` is on in SvelteKit's generated tsconfig; verify with svelte-check).

- [ ] **Step 3: Write `scripts/build-cuts.ts`**

```ts
/**
 * Precompute a die-cut path for every library logo art (icon/wordmark × light/dark, deduped by URL).
 * Run: ./node_modules/.bin/vite-node scripts/build-cuts.ts   → src/lib/stickers/cuts.json
 */
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LOGOS, artFor } from "../src/lib/stickers/logos";
import { cutPath, type Alpha } from "../src/lib/stickers/cut";
import { DEFAULT_STYLE, smoothMm } from "../src/lib/stickers/style";

const SIZE = 512; // long side, same as alpha.ts
const ART_W = 100; // canonical mm
const MARGIN = 3; // ≈ 1.5mm border scaled for thumbnails to read as vinyl

function alphaOf(file: string): Alpha | null {
  try {
    const svg = readFileSync(file);
    const r = new Resvg(svg, { fitTo: { mode: "width", value: SIZE } });
    const png = r.render();
    const w = png.width, h = png.height;
    const px = png.pixels; // RGBA
    const data = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) data[i] = px[i * 4 + 3] / 255;
    return { w, h, data };
  } catch (e) {
    console.warn("skip", file, (e as Error).message);
    return null;
  }
}

const urls = new Set<string>();
for (const l of LOGOS) for (const v of ["icon", "wordmark"] as const) for (const t of ["light", "dark"] as const) {
  if (v === "wordmark" && !l.wordmark) continue;
  urls.add(artFor(l, v, t));
}

const out: Record<string, { d: string; aspect: number }> = {};
let n = 0;
for (const href of urls) {
  const a = alphaOf(join("static", href)); // hrefs are "/library/x.svg"
  if (!a) continue;
  const aspect = a.w / a.h;
  const artW = aspect >= 1 ? ART_W : ART_W * aspect;
  const artH = aspect >= 1 ? ART_W / aspect : ART_W;
  const d = cutPath(a, { artW, artH, margin: MARGIN, smooth: smoothMm(DEFAULT_STYLE.smooth, artW, artH), fillHoles: true, merge: true });
  if (!d) continue;
  out[href] = { d: d.replace(/(\d+\.\d)\d+/g, "$1"), aspect: Math.round(aspect * 1000) / 1000 };
  if (++n % 100 === 0) console.log(n, "done");
}
writeFileSync("src/lib/stickers/cuts.json", JSON.stringify(out));
console.log("wrote", Object.keys(out).length, "cuts of", urls.size, "arts");
```
Check how hrefs are formed in `logos.ts`/`src/data/svgs.ts` (they may be `/library/foo.svg`); if `cutPath` centres the path on the art box, note the origin convention in a comment in `cuts.ts` so `Sticker.svelte` draws it right (read `cutPath`'s doc comment: "in mm, centred on the art box"). If resvg can't fit by width for tall logos, use `fitTo: { mode: "height" }` when the viewBox is taller than wide. Run it; expect well over 1,000 entries and a JSON under ~3 MB. If it's larger, round more aggressively (integers after scaling the box to 100) until it is.

- [ ] **Step 4: Run tests → pass; commit script + JSON + cuts.ts**

- [ ] **Step 5: `Sticker.svelte`**

```svelte
<script lang="ts">
  /** SVG sticker: white vinyl (precomputed die-cut path) + logo art. Place inside an <svg> whose units are mm. */
  import type { CutEntry } from "$lib/stickers/cuts";
  import { CANON } from "$lib/stickers/cuts";
  let { href, cut = null, x, y, w, rot = 0, shadow = true }: {
    href: string; cut?: CutEntry | null; x: number; y: number; w: number; rot?: number; shadow?: boolean;
  } = $props();
  const aspect = $derived(cut?.aspect ?? 1);
  const h = $derived(w / aspect);
  // paths were traced in a CANON.artW-wide box (or CANON.artW tall when aspect < 1)
  const k = $derived(aspect >= 1 ? w / CANON.artW : h / CANON.artW);
  const pad = $derived(w * 0.06);
</script>

<g transform="translate({x} {y}) rotate({rot})" style={shadow ? "filter: drop-shadow(0 0.6px 0.6px rgb(0 0 0 / .25)) drop-shadow(0 2px 3px rgb(0 0 0 / .18))" : undefined}>
  {#if cut}
    <path d={cut.d} transform="scale({k})" fill="#fff" />
  {:else}
    <rect x={-w / 2 - pad} y={-h / 2 - pad} width={w + 2 * pad} height={h + 2 * pad} rx={w * 0.12} fill="#fff" />
  {/if}
  <image {href} x={-w / 2} y={-h / 2} width={w} height={h} preserveAspectRatio="xMidYMid meet" />
</g>
```
Note: `CANON` is a plain const; importing it from `cuts.ts` would drag `cuts.json` into the client bundle. **Move `CANON` and `CutEntry` into `src/lib/stickers/cuts-types.ts`** (no JSON import) and re-export them from `cuts.ts`; `Sticker.svelte` imports from `cuts-types`. Verify with `vite build` that `cuts.json` does not appear in any client chunk (`grep -rl '"d":"M' .svelte-kit/output/client` must find nothing).

- [ ] **Step 6: `StackLid.svelte` uses it**

Add prop `cuts?: Record<string, CutEntry>` (default `{}`), replace the `<image>` loop with `<Sticker href={artFor(...)} cut={cuts[href] ?? null} x={s.x} y={s.y} w={s.w} rot={s.rot} />`. Keep the device rects. Update the four server loads to also return `cuts: cutsFor(artUrlsIn(layouts))` and the four pages to pass `cuts={data.cuts}` to every `StackLid`. Run `vite build`, check `/gallery` cards now show white die-cut stickers (node build/index.js, open in browser or curl the HTML and grep for `<path d="M`).

- [ ] **Step 7: Commit** `feat(stickers): precomputed die-cut paths and shared Sticker renderer`.

---

## Task 1: Site chrome, star count, layout wiring, brand_requests schema

**Files:**
- Create: `src/components/site/SiteFrame.svelte`, `AnnouncementBar.svelte`, `StatsBar.svelte`, `SiteNav.svelte`, `SiteFooter.svelte`, `SiteChrome.svelte`, `src/lib/server/github.ts`, `src/lib/format.ts`, `src/routes/+layout.server.ts`, `tests/server/github.test.ts`, `tests/format.test.ts`, `drizzle/0003_brand_requests.sql` (via `pnpm db:generate`)
- Modify: `src/routes/+layout.svelte` (bare list), `src/lib/server/db/schema.ts`, the pages that import `StackHeader` (`/`, `/gallery`, `/stacks`, `/stack/[id]`, `/support`) → `SiteChrome` + `SiteFooter`; delete `src/components/stack/StackHeader.svelte`.

**Interfaces:**
- Produces: `formatCount(n: number): string` (`999 → "999"`, `4821 → "4.8k"`, `12600 → "12.6k"`, `1_200_000 → "1.2m"`); `getStars(): Promise<number | null>`; layout data `{ stars: number | null }` available to every page as `data.stars`; components `SiteChrome` (`{ stars?: number | null }`), `SiteFrame` (children), `SiteFooter` (no props); `brandRequests` table export.
- Consumes: `REPO_URL`, `UPSTREAM` from `$lib/support`.

- [ ] **Step 1: `formatCount` + test** (TDD as above; `src/lib/format.ts`).
- [ ] **Step 2: `getStars` + test**

```ts
// src/lib/server/github.ts
import { REPO_URL } from "$lib/support";
const TTL = 60 * 60 * 1000;
let cache: { at: number; value: number | null } | null = null;
export async function getStars(fetchFn: typeof fetch = fetch, now = Date.now()): Promise<number | null> {
  if (cache && now - cache.at < TTL) return cache.value;
  const repo = REPO_URL.replace("https://github.com/", "");
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const r = await fetchFn(`https://api.github.com/repos/${repo}`, { headers: { accept: "application/vnd.github+json", "user-agent": "stack-stickers" }, signal: ctrl.signal });
    clearTimeout(t);
    const value = r.ok ? Number((await r.json()).stargazers_count) || null : null;
    cache = { at: now, value };
    return value;
  } catch {
    cache = { at: now, value: null };
    return null;
  }
}
export const _resetStarsCache = () => (cache = null);
```
Tests: returns count from a mocked fetch; returns null on 403; caches (second call doesn't call fetch); null result is cached too (no retry storm).

- [ ] **Step 3: `+layout.server.ts`** returns `{ stars: await getStars() }`. Keep it tiny; nothing else goes here.
- [ ] **Step 4: Chrome components** per the spec §3 and `docs/design/Stack Stickers Home.dc.html` (bars + nav + footer markup). Nav tabs: Gallery `/gallery`, My stacks `/stacks`, Logos `/logos`, Docs `/docs`, ♥ Support `/support`; active = `page.url.pathname.startsWith(href)`; `/` none. CTA: `<Button href="/editor" size="sm" class="h-[34px]">Make your lid</Button>`. Stats bar: `v3.0` chip and the "Light mode and print sheets are here →" link both → `${REPO_URL}/releases`; right: GitHub mark (`/library/github_light.svg`, use `dark:invert`) "Star on GitHub" + mono chip `formatCount(stars)` only when `stars != null`. Footer links per spec §3. `SiteFrame`: `<div class="mx-auto w-full max-w-[1120px] border-x border-border">{@render children()}</div>`. Announcement bar: `bg-foreground text-background` so it inverts in dark mode.
- [ ] **Step 5: Wire pages**: replace `StackHeader` in the five pages with `<SiteChrome stars={data.stars} />` at the top and `<SiteFooter />` at the bottom inside a `SiteFrame` where the page has no own frame (gallery/stacks/stack pages: wrap their `<main>` in `SiteFrame` so the side rules line up; keep their inner padding). Delete `StackHeader.svelte`. Update `+layout.svelte` `isStackPage` to also match `/brands`, `/docs`, `/legal`, `/support` and keep the error page bare (`page.error` → bare).
- [ ] **Step 6: Schema**: add to `schema.ts`

```ts
export const brandRequests = pgTable("brand_requests", {
  id: text("id").primaryKey(), // "BR-" + 6 chars
  mode: text("mode", { enum: ["remove", "update", "feature"] }).notNull(),
  company: text("company").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  logos: jsonb("logos").$type<string[]>().notNull().default([]),
  plan: text("plan"),
  details: text("details"),
  authorized: boolean("authorized").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```
Run `pnpm db:generate` (creates `drizzle/0003_*.sql`) and `pnpm db:migrate` (DATABASE_URL in `.env`). Commit the migration.
- [ ] **Step 7:** `vite build` + `vitest` green; smoke `/gallery` shows the new chrome. Commit `feat(site): shared chrome, live star count, brand_requests table`.

---

## Task 2: Home `/`

**Files:** Replace `src/routes/+page.svelte`; modify `src/routes/+page.server.ts`; create `src/components/home/HeroScatter.svelte` (absolute-positioned decorative `<svg>` stickers from a `[file, left, top, size, rot, far][]` list), `src/components/home/Marquee.svelte`, `src/components/home/LidPreview.svelte` (the device card with the title bar + `StackLid`).
**Interfaces:** consumes Task 0 (`Sticker`, `StackLid cuts`, `cutsFor`, `artUrlsIn`, `cutFor`), Task 1 (`SiteChrome`, `SiteFrame`, `SiteFooter`), `listGallery`, `LOGOS.length`, `STACKS`/`buildLayout` from `$lib/stacks/mock` for the fallback demo lid.

- [ ] Server load: `const stacks = (await listGallery("trending")).slice(0, 4)`; `const hero = stacks[0]?.layout ?? buildLayout(toKeys([...12 keys from the mock GAL[0]...]), "silver", 1)`; decorative hrefs = the HSTK/CSTK/LAY/SHEET files mapped to `/library/<file>`; return `{ stacks, hero, cuts: cutsFor([...artUrlsIn([hero, ...stacks.map(s => s.layout)]), ...decorative]), logoCount: LOGOS.length }`. If `stacks.length === 0`, use `STACKS.slice(0,4)` from the mock so the teaser is never empty (Review Focus 5) — add a vitest for a small pure helper `pickTeaser(stacks, mock)`.
- [ ] Build the sections exactly in the order of spec §4.1, reading the mock for sizes. Hero frame background: `bg-[radial-gradient(ellipse_at_top,theme(colors.emerald.200),theme(colors.sky.200))] dark:bg-[radial-gradient(ellipse_at_top,theme(colors.emerald.900),theme(colors.sky.950))]` as the placeholder for the meadow photo; if `static/images/hero-meadow.png` exists at build time, use it (`bg-[url('/images/hero-meadow.png')] bg-cover`) — leave a comment saying the gradient is the fallback.
- [ ] Decorative stickers: each is an `<svg viewBox="-60 -60 120 120" class="absolute" style="left:..px; top:..px; width:..px">` containing one `<Sticker href cut x={0} y={0} w={100} rot />`. The "far" ones get `opacity-80 blur-[1.2px]`.
- [ ] Marquee: duplicate the list twice, `animate-[ss-marquee_60s_linear_infinite]` with the keyframes in a `<style>` block, `motion-reduce:animate-none`, fade masks on both ends.
- [ ] Gallery teaser cards link to `/stack/{id}`; `@{by}` right.
- [ ] `vite build`; smoke `curl localhost:PORT/` contains "Your whole" and 4 teaser cards; dark mode check. Commit `feat(home): landing page from the new design`.

---

## Task 3: For Brands `/brands` + `/api/brand-requests`

**Files:** Create `src/routes/brands/+page.svelte`, `src/lib/brands.ts` (MODES, PLANS, FREE_MAIL, `brandRequestSchema` zod, `makeRequestId`), `src/routes/api/brand-requests/+server.ts`, `src/lib/server/brand-requests.ts` (`createBrandRequest(input): Promise<{ id }>` with mock fallback when `db` null), `tests/brands.test.ts`. Modify `src/lib/support.ts` `BRAND_TIERS` prices/perks to the design copy.
**Interfaces:** `brandRequestSchema = z.object({ mode: z.enum([...]), company: z.string().trim().min(1).max(120), name: ..., email: z.string().trim().toLowerCase().email().max(200), logos: z.array(z.string()).max(20), plan: z.enum(["verified","featured","partner"]).nullable(), details: z.string().max(2000).nullable(), authorized: z.boolean() }).superRefine(...)` with the mode-dependent rules from the spec (free-mail rejection, ≥1 known logo key, authorized true) — unknown logo keys are rejected (`isKnownLogo`). `makeRequestId()` → `BR-` + 6 chars from `ABCDEFGHJKMNPQRSTVWXYZ23456789` via `crypto.getRandomValues`.
- [ ] TDD the schema (valid remove, free-mail remove → error on `email`, feature with gmail → ok, unknown logo → error on `logos`, details 20 kB → error, missing auth → error on `authorized`) and the id format.
- [ ] Endpoint: parse JSON, `safeParse`, on failure `400 { errors: Record<string,string> }` (first message per field), on success `201 { id }`. On DB error → 503.
- [ ] Page per spec §4.2 and the mock. Client-side validation mirrors the schema by importing `brandRequestSchema` (it's isomorphic; zod is already in the client bundle? check — if not, keep it, zod is small). Logo picker suggestions from `LOGOS` filtered by `title`, max 5, chip shows `/library/...` icon. Hash sync via `onMount` + `hashchange`; `history.replaceState` on mode/plan change.
- [ ] Smoke: `curl -X POST localhost:PORT/api/brand-requests -d '{"mode":"remove",...}'` → 201 with `BR-`; `/brands` 200. Commit `feat(brands): brand request page and endpoint`.

---

## Task 4: Docs `/docs/[slug]`

**Files:** Create `src/lib/docs/articles.ts` (data + `ARTICLES`, `SEQ`, `GROUPS`, `getArticle(slug)`), `src/routes/docs/+page.server.ts` (redirect 307 → `/docs/works`), `src/routes/docs/[slug]/+page.server.ts` (404 via `error(404)` for unknown), `src/routes/docs/[slug]/+page.svelte`, `src/components/docs/Toc.svelte` (scroll-spy), `src/components/docs/PrintMethods.svelte` (segmented control + 3 step lists), `src/components/docs/Faq.svelte` (shadcn Accordion), `tests/docs.test.ts` (unique slugs, every TOC id has a section, SEQ covers all).
**Content shape:** `type Article = { slug; label; eyebrow; title; lede?; meta?; toc: [id, label][]; }` and the bodies as Svelte markup in the page keyed by slug (`{#if slug === "print"} … {/if}`), simplest thing that works; the data file holds only structure + nav. Correct the copy per spec §4.3: export table rows = PNG (Image, "Sharp image for posting anywhere"), SVG (Vector, "Every sticker stays editable in Figma"), PDF (Print, true size with cut lines) — read `ExportDialog.svelte` `FORMATS`; laptops from `$lib/stickers/laptops.ts` (render the table from that data); "Where your stacks live" → in your browser, and on our server once you save or share; FAQ laptop answer from the same data; repo links to `https://github.com/PaoloJN/stack-stickers`. Drop the 50 mm ruler and placement-guide claims; replace "TEST FIRST" callout body with "Print one sheet on plain paper and measure a sticker against the size shown in the editor before you use vinyl."
- [ ] Commit `feat(docs): docs section with five articles`.

---

## Task 5: Legal `/legal/[doc]`

**Files:** Create `src/lib/legal/docs.ts` (`LEGAL_DOCS`, `getLegalDoc`, alias map `tm → trademark`), `src/routes/legal/+page.server.ts` (→ `/legal/terms`), `src/routes/legal/[doc]/+page.server.ts` (alias redirect 301, unknown 404), `src/routes/legal/[doc]/+page.svelte`, `tests/legal.test.ts`.
- [ ] Content from the mock with the privacy corrections in spec §4.4. "View history on GitHub ↗" → `${REPO_URL}/commits/main/src/lib/legal/docs.ts`.
- [ ] Commit `feat(legal): terms, privacy, affiliate and trademark pages`.

---

## Task 6: Error page `src/routes/+error.svelte`

- [ ] Per spec §4.5 and the 404 mock. Uses `page.status`/`page.error.message`; 8 decorative stickers via `Sticker.svelte` in small `<svg>`s positioned by `%`, hover: `transition-transform duration-[400ms] ease-[cubic-bezier(.2,1.6,.4,1)] hover:-translate-y-1.5 hover:scale-110` and a reduced rotation (two rotation values via CSS custom props). The error page has no server load, so cuts can't come from `load`: pass none → the rounded-square fallback is fine here? **No** — spec wants die-cut. Solution: `+layout.server.ts` (Task 1) additionally returns `errorCuts: cutsFor(ERROR_STICKER_HREFS)` (8 small entries, ~10 kB) so `page.data.errorCuts` is available to the error page. Add that to Task 1's layout load (coordinate: the Task 1 implementer adds `errorCuts`; define `ERROR_STICKERS` list in `src/lib/site/error-stickers.ts`).
- [ ] Verify `/nope` renders 404 with chrome; a thrown 500 shows "Something went wrong". Commit `feat(site): 404 and error page`.

---

## Task 7: Support v2 `/support`

- [ ] Rebuild `src/routes/support/+page.svelte` per spec §4.6 and the mock, keeping `$lib/support` and `showPending`. Sponsor URL builder in `src/lib/sponsor-url.ts`: `sponsorUrl(user, { frequency: "recurring" | "one-time", amount })` → `https://github.com/sponsors/${user}?frequency=${f}&amount=${n}` with a test. Remove `EthicalAd` usage if it no longer fits the layout (keep the component file). Commit `feat(support): support page v2`.

---

## Task 8: Final review + merge

- [ ] `vitest`, `svelte-check`, `vite build` green; smoke every route (200s, 404 page, POST endpoint). Dark-mode pass on each page. Final review by a reviewer subagent on the whole branch; fix; merge to `main` (no PR needed, fast-forward), push, restart the preview server on :4173.
