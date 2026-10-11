# Marketing pages + sticker prep — Design Spec

- **Date:** 2026-10-07
- **Status:** Approved in chat 2026-10-07
- **Source design:** Claude Design project `7e6fff65-fc26-491b-9084-807a736e8b47`, files saved to `docs/design/*.dc.html` (Home, For Brands, Docs, Legal, 404, Support v2). Treat those files as the visual source of truth for layout, spacing, copy and hierarchy.

## 1. Goal

Ship the public "marketing" surface of Stack Stickers from the new design, desktop first, using our existing stack (SvelteKit, Tailwind v4, shadcn-svelte, lucide, semantic colour tokens that work in light and dark). Keep it simple: no new state libraries, no animation libraries, no iframes. Interactive flourishes (hero editor demo, sticker-cursor, pop-in animations) are explicitly deferred; the static layout is what matters now.

Also fix the root cause of "logos look like icons, not stickers" on every server-rendered page by precomputing die-cut outlines once, so thumbnails, hero art and decorative stickers match the editor.

### Decisions (from the brainstorm)
- Hero: **static** composed lid preview on the meadow photo. No live editor embed yet.
- Top bars: **both**. Black "FOR BRANDS" announcement bar and the "v3.0 · Star on GitHub <live count>" bar. No "stacks liked" (no data). Star count is fetched server-side and cached.
- For Brands form: **saved to Neon** (`brand_requests` table + JSON endpoint). No email confirmation step yet.
- Nav: Gallery · My stacks · Logos · Docs · ♥ Support, plus "Make your lid" → `/editor`.
- Legal contact stays `legal@stackstickers.dev` as in the design.

### Non-goals
Phone layouts, Gallery / My stacks / Shared stack / Logos redesigns (their `.dc.html` files exist; later), email sending, auth, an admin for brand requests, SEO logo pages.

## 2. Task 0 — sticker prep (die-cut paths)

**Problem.** `src/components/editor/StickerView.svelte` draws real die-cut stickers, but the outline is computed in the browser (`$lib/stickers/alpha.ts` rasterises the art on a canvas, `$lib/stickers/cut.ts` traces it). `src/components/stack/StackLid.svelte` is server-rendered and draws bare `<image>` logos.

**Solution.** Precompute one cut path per logo art, at build time, into a server-only JSON; add a shared SVG sticker renderer that uses it.

- `scripts/build-cuts.ts` (run with vite-node, like `db:seed`): for every `StickerLogo` in `$lib/stickers/logos` and each art URL it exposes (icon/wordmark × light/dark, deduplicated by URL), rasterise the SVG from `static/library` with `@resvg/resvg-js` (new devDependency) into an `Alpha` (long side 512, same as `alpha.ts`) and call `cutPath` with canonical options: `artW = 100`, `artH = 100 / aspect` (or the transpose when taller than wide), `margin = 3`, `smooth = smoothMm(defaults)`, `fillHoles = true`, `merge = true` (match `DEFAULT_STYLE` in `$lib/stickers/style.ts` for everything except the fixed canonical size). Round coordinates to 0.1. Write `src/lib/stickers/cuts.json` as `{ [artUrl]: { d: string, aspect: number } }`. Logos that fail to rasterise are skipped with a warning (the renderer falls back to a rounded-square backing).
- `src/lib/stickers/cuts.ts` (server-only import of the JSON): `cutFor(artUrl): { d, aspect } | null` and `cutsFor(urls: string[]): Record<string, CutEntry>`.
- `src/components/stack/Sticker.svelte`: pure SVG snippet-style component. Props: `href`, `cut?: CutEntry | null`, `x`, `y`, `w` (mm, art width), `rot`, `dark?` (device dark → white vinyl stays white; this is only for the shadow tone). Draws: drop shadow (SVG filter defined once by the parent via `StickerDefs`-like `<defs>`, or a simple `filter: drop-shadow` CSS on the group), white vinyl `<path d>` scaled from the canonical 100 mm box to `w` (`transform="translate(x y) rotate(rot) scale(w/100)"` around the centre), then the `<image>`. When `cut` is null: a white rounded rect backing with 3 % padding.
- `StackLid.svelte` gains a `cuts?: Record<string, CutEntry>` prop and renders each sticker through `Sticker.svelte`. Server loads that render lids (`/`, `/gallery`, `/stacks`, `/stack/[id]`) call `cutsFor(artUrlsIn(layouts))` and pass the map through `data`. Without `cuts` it falls back to the backing rect, so nothing breaks.
- `npm script`: `"build:cuts": "vite-node scripts/build-cuts.ts"`. Not part of `build`; the JSON is committed. A vitest test checks a handful of known logos have a non-empty path and that paths are well-formed.
- Size guard: the JSON must stay server-only (import only from `*.server.ts` / `$lib/server` or from `cuts.ts` which is only imported by server code). The marketing pages pass their decorative sticker cuts through `load` too.

**Decorative stickers on marketing pages** (hero scatter, 404, "small stuff" cards) are plain `<svg>`s using `Sticker.svelte` with a fixed logo list, positioned absolutely as in the design.

## 3. Shared chrome — `src/components/site/`

Replaces `StackHeader.svelte` everywhere it's used (`/`, `/gallery`, `/stacks`, `/stack/[id]`, `/support`). Delete `StackHeader.svelte` once nothing imports it.

- `SiteFrame.svelte`: the 1120 px centred column with 1 px left/right rules (`border-x border-border`), `max-w-[1120px] mx-auto`. Pages compose sections inside it with `border-t border-border` dividers, matching the design's grid feel.
- `AnnouncementBar.svelte`: black bar, "FOR BRANDS" mono chip, copy, link → `/support#brands`. In dark mode invert (`bg-foreground text-background`).
- `StatsBar.svelte`: `v3.0` chip → `https://github.com/PaoloJN/stack-stickers/releases`, "Light mode and print sheets are here →" (same link), right side "Star on GitHub <count>" → repo. Takes `stars: number | null` from layout data; hides the count chip when null.
- `SiteNav.svelte`: 64 px grid (brand / tabs / CTA) exactly like the design: brand `svgl.svg` + "Stack Stickers"; tabs Gallery `/gallery`, My stacks `/stacks`, Logos `/logos`, Docs `/docs`, ♥ Support `/support` (red heart glyph); active tab from the path (`bg-accent text-foreground font-medium`); CTA Button "Make your lid" → `/editor`. Sticky with backdrop blur (the Docs design does this; use it everywhere, it's harmless).
- `SiteFooter.svelte`: 4-column grid (brand + blurb, Product, Resources, Legal) and the copyright row (`© 2026 Stack Stickers · Logos from svgl. Every logo belongs to its owner.` + GitHub / X links from `$lib/support`). Links: Editor `/editor`, Gallery, Logos, Support, Docs `/docs`, How to print `/docs/print`, Contribute `/docs/contribute`, GitHub (repo), Terms `/legal/terms`, Privacy `/legal/privacy`, Affiliate `/legal/affiliate`, Trademark `/legal/trademark`, Brand removal request `/brands#remove`.
- `SiteChrome.svelte`: convenience wrapper = AnnouncementBar + StatsBar + SiteNav. Pages render `<SiteChrome stars={data.stars} />` … `<SiteFooter />`.
- **Star count:** `src/lib/server/github.ts` → `getStars()`: `fetch("https://api.github.com/repos/PaoloJN/stack-stickers")`, in-memory cache 1 h, 2 s timeout, returns `number | null` on any error. Called from a new `src/routes/+layout.server.ts` so every page has `data.stars`. Format `4.8k` style via a tiny `formatCount` (unit-tested).
- Root `+layout.svelte`: the "bare" page list grows to include `/brands`, `/docs`, `/legal`, `/support`. The error page is also bare.

## 4. Pages

All pages: `<svelte:head>` title + description, `SiteChrome` + `SiteFrame` + `SiteFooter`, semantic tokens only (no hex colours in markup), Geist (already loaded globally), mono eyebrows via `font-mono text-[11.5px] tracking-[.08em] uppercase text-muted-foreground`.

### 4.1 `/` Home (replace `src/routes/+page.svelte`)
Sections, top to bottom, per `Stack Stickers Home.dc.html`:
1. Hero card (dotted grid, 18 px radius): 8 scattered decorative stickers (positions from the design's `HSTK`, static), headline "Your whole [sticker] stack, on your laptop lid." with one inline sticker image inside the headline (static React logo, rotated), subcopy, CTAs "Open the editor" → `/editor`, "Browse the gallery" → `/gallery`. Below: the meadow-photo frame (`/images/hero-meadow.png`) containing a **static** lid preview: `StackLid` of the first gallery stack (or a fixed demo layout from `$lib/stacks/mock` when the gallery is empty) inside a device-like card with a title bar "MacBook Pro 14″ · Silver" and "304 × 215 mm · 1:1".
2. Logo marquee: "670 LOGOS, INCLUDING" (use the real `LOGOS.length` from `$lib/stickers/logos`) + a CSS-only infinite marquee of ~26 greyscale logo + name pairs (the design's `MQ` list), respecting `prefers-reduced-motion`.
3. "How it works" heading block, then three alternating 2-column rows (01 True scale, 02 All of svgl, 03 Take it off the screen) with the design copy and static illustrations: (01) a device card with ruler and two stickers plus a selection box and a `50.8 × 50.8 mm · −6°` pill; (02) scattered stickers + a search pill "Search N logos… ⌘K"; (03) the post card / share-link stamp / A4 sheet composition. Build these from `Sticker.svelte` and plain divs; no interactivity.
4. "The small stuff, done right": 3 cards (Shapes, Shuffle, Layers) with static visuals and copy; the segmented control / shuffle button / layer chip are rendered but inert (visual only, `aria-hidden`), to be wired later.
5. Gallery teaser: "Lids from other desks" + "See all stacks →", 4 cards from `listGallery("trending")` using `StackLid` with cuts; card footer name + `@by`.
6. CTA block "Start with a blank lid." with 4 decorative stickers and the two CTAs.
7. Footer.
Server load: `stacks` (first 4), `cuts` for those + the decorative logos, `logoCount`.

### 4.2 `/brands` For Brands (new)
Per `Stack Stickers For Brands.dc.html`.
- Mode cards (Remove / Update / Feature) as a radio group (`role="radiogroup"`, keyboard accessible); hash sync: `#remove|#update|#feature` select a mode, `#verified|#featured|#partner` select Feature + that plan. Update the hash on change (`replaceState`).
- Plans grid only in Feature mode, from `BRAND_TIERS` in `$lib/support` (adjust those strings to the design copy: prices `$49`, `$299`, `$1,500` "/ month", perks as in the design).
- Form (left column) with shadcn `Input`, `Textarea`, `Checkbox`, `Button`: company, your name, work email, "Which logos?" chip picker with suggestions from `LOGOS` (name contains query, max 5, excludes chosen; shows nothing for "on N lids" since we have no data), plan chips (Feature only; "Not sure yet" allowed), details textarea (label/placeholder per mode), authorisation checkbox (Remove/Update only). Validation per the design: required company/name, email format, free-mail domains rejected for Remove/Update, ≥1 logo for Remove/Update, auth checkbox for Remove/Update. Errors inline in `text-destructive`. Submit label per mode/plan; note text per mode.
- Success state: check mark, "Request received", a reference table (REFERENCE, Request, Logos | Plan, Next), "Send another request" resets.
- Right column: "How removal/updates/sponsorship works" 3 steps per mode; "GOOD TO KNOW" card; then the TRADEMARK NOTICE strip and footer.
- **Backend:** `brand_requests` table in `src/lib/server/db/schema.ts`: `id` (text pk, `BR-` + 6 uppercase base32 chars), `mode` enum remove|update|feature, `company`, `name`, `email`, `logos` jsonb string[], `plan` text nullable, `details` text nullable, `authorized` boolean, `createdAt`. Drizzle migration `0003`. `POST /api/brand-requests` validates with zod (same rules as the client), inserts, returns `201 { id }`. When `db` is null (no `DATABASE_URL`) it still returns a generated id (mock mode, log a warning). Rate limit not required now. Unit tests for the zod schema and the id generator.

### 4.3 `/docs/[slug]` Docs (new)
Per `Stack Stickers Docs.dc.html`. `/docs` redirects (307) to `/docs/works`.
- Content lives in `src/lib/docs/articles.ts` as typed data (slug, title, eyebrow, lede, meta line, sections with `id` + heading + body as Svelte snippets or simple structured blocks). Slugs: `works`, `print`, `contribute`, `missing`, `faq`. Keep the design's copy but **make it true**: export formats are what `ExportDialog.svelte` offers (PNG / SVG / PDF with cut lines; check `FORMATS`), laptops are the ones in `$lib/stickers/laptops.ts`, stacks are saved "in your browser and, once you save or share, on our server" (we have My stacks now), the repo URL is `https://github.com/PaoloJN/stack-stickers`. Drop claims we can't back (the 50 mm ruler, the placement-guide page) unless the export really has them.
- Layout: 232 px sticky sidebar (groups GET STARTED / PRINTING / CONTRIBUTE / HELP + MORE: For brands `/brands`, GitHub), content column `max-w-[660px]`, 200 px sticky "ON THIS PAGE" TOC with scroll-spy (IntersectionObserver, client only) and smooth-scroll links. Prev/next cards in `SEQ` order. "Was this page helpful?" Yes/No → local "Thanks, noted." (no network). "Edit this page on GitHub" → the article file on GitHub.
- Print article: the three-way segmented control (Print shop / Cricut / Silhouette) switches the step list. FAQ: shadcn `Accordion`, first item open.

### 4.4 `/legal/[doc]` Legal (new)
Per `Stack Stickers Legal.dc.html`. `/legal` → `/legal/terms`. Docs: `terms`, `privacy`, `affiliate`, `trademark` (accept `tm` as an alias → redirect). Data in `src/lib/legal/docs.ts` (label, title, updated, "in short" bullets, sections). Sidebar with the 4 docs, "Brand removal request →" `/brands#remove`, "Questions? legal@stackstickers.dev". Content column with the IN SHORT box, sections, and the footer row ("Something unclear?" + "View history on GitHub ↗" → the file's history URL). Privacy table rows updated to reality: stacks (your browser + our server once saved), shared lids (our server), page views (none yet: say "We don't run analytics yet.").

### 4.5 `src/routes/+error.svelte` (new)
Per `Stack Stickers 404.dc.html`: chrome, dotted hero with 8 decorative stickers that lift and straighten on hover (CSS transition only), big status number (`page.status`, 200 px), title "This page peeled off" for 404 or "Something went wrong" otherwise, copy, CTAs Back to home / Browse logos / Gallery, footer.

### 4.6 `/support` Support v2 (restyle existing)
Per `Stack Stickers Support v2.dc.html`, keeping `src/lib/support.ts` as the data source and its rule: `null` links hidden in prod, "not set up" tag in dev.
- Hero + "HERE FOR YOUR BRAND?" card → `#brands`.
- GitHub Sponsors card: frequency segmented control (Monthly / One-time) and amount chips (`3/5/10/25` monthly, `5/10/25/50` one-time) that build the real URL `https://github.com/sponsors/PaoloJN?frequency=recurring|one-time&amount=N`; button label "Sponsor $N a month|once on GitHub". Ko-fi card and "Need an invoice?" card (Open Collective coming; "get in touch" → `/brands#feature`).
- "Thank you" sponsor avatar row: **omit** until there's real data (leave a TODO comment pointing at the design).
- `#brands` section: heading, the mock logo-picker card with the SPONSORED row illustration, 3 plan cards from `BRAND_TIERS` with CTAs → `/brands#verified|#featured|#partner`, the 3 guarantees row + "Remove or update a logo instead →" `/brands#remove`.
- "Free ways to help" 3 cards, the "Print through our links" card listing `PRINT_SHOPS` + `SUPPLIES` with the PAID LINKS label when any affiliate link is set, "Read the printing guide first →" `/docs/print`.
- "Built on svgl" strip with "Sponsor pheralb" → `UPSTREAM.sponsors`.
- Keep the existing `EthicalAd` only if it still fits; otherwise remove it.

## 5. Testing

- vitest: `formatCount`, `getStars` cache/fallback (mock fetch), brand request zod schema + id, cuts JSON sanity, docs/legal data integrity (unique slugs, TOC ids exist in sections).
- `vite build` must pass; each route returns 200 (`/`, `/brands`, `/docs/print`, `/legal/privacy`, `/support`, `/gallery`, `/stacks`, `/nope` → 404 with the error page) via a curl smoke against `node build/index.js`.
- Accessibility basics: radio groups and segmented controls keyboard operable, headings in order, images decorative (`alt=""`).

## 6. Delivery

Branch `feat/marketing-pages`. Order: Task 0 (cuts + Sticker + StackLid) and Task 1 (chrome + stars + layout + schema/migration) in parallel; then pages 4.1–4.6 in parallel; then a final review and merge to `main`.
