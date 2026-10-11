# Stack Stickers — Design Spec

- **Date:** 2026-10-04
- **Status:** Approved 2026-10-04 (editor switched to Framer-style)
- **Name:** "Stack Stickers" (temporary; `stackstickers.dev`)
- **License:** MIT (code). Logos remain the property of their owners.

## 1. Goal

A free, open-source web toy for developers: design a true-to-scale MacBook lid covered in stickers of the tools and companies you like, auto-fill it from your GitHub stack, and share it (link, OG image, GitHub README image) or print it yourself.

Nothing is sold. Success = people share their laptops on X and embed the README image on their GitHub profiles.

### Non-goals (v1)
Accounts, private repos, saved short links, public gallery, user-uploaded logos, non-Mac laptops, cut-line exports (Cricut/Silhouette), peel physics simulation.

## 2. Surfaces

| Route | Purpose |
|---|---|
| `/` | Landing. Scattered, draggable, randomly rotated stickers (reshuffled each visit), big Geist headline, CTAs "Design your laptop" → `/editor` and "Browse stickers" → `/stickers`. |
| `/stickers` | svgl-style catalog: search, category sidebar with counts, light/dark toggle, Favorites view. Card actions: download (raw SVG, sticker SVG, sticker PNG), ❤️ favorite (localStorage), "Add to laptop" (→ `/editor?add=<logoId>`). |
| `/editor` | Framer-style editor (see §6). Starts with a few starter stickers. Accepts `?add=<id>`, `?d=<layout>` (load shared layout), `?gh=<username>` (auto-fill). |
| `/s?d=<layout>` | Read-only share view of a layout + "Remix in editor". OG image = the layout. |
| `/<username>` | Laptop auto-filled from that GitHub user (deterministic). "Edit this" → editor. OG image = the laptop. |
| `/<username>.png` | Live PNG of `/<username>` for README embeds (rewrite → `/api/laptop/<username>`). |
| `/credits` | Logo sources + licenses, trademark disclaimer, takedown process. |

`/<username>` only matches valid GitHub usernames (`^[a-z\d](?:[a-z\d-]{0,38})$`, case-insensitive) that aren't reserved route names (`stickers`, `editor`, `s`, `credits`, `api`, `logos`, …); everything else 404s.

Global footer on every page: "Logos are trademarks of their respective owners. Not affiliated. Request removal →".

## 3. Stack

- **Next.js 16** (App Router, TypeScript), **pnpm**, deployed on **Vercel**. No database.
- **Tailwind CSS v4** + **shadcn/ui** + **Geist / Geist Mono**, neutral grayscale palette, class-based dark mode — copied in spirit from svgl (rounded-md, neutral-200/800 borders, subtle hover fills, 40px logo cells, 15px medium titles).
- State: **zustand** (+ **zundo** for undo/redo) in the editor. Animation: **motion** (Framer Motion).
- Search: **fuse.js**. Layout URL encoding: **lz-string**.
- Server raster: **@resvg/resvg-js** (SVG → PNG) in Node route handlers.
- PDF: **jsPDF + svg2pdf.js** (client-side).
- Tests: **Vitest** (pure modules), **Playwright** (smoke).

## 4. Logo catalog pipeline

Logos are **vendored at build-script time and committed** — never fetched from third-party APIs at runtime (svgl's API is 5 req/10s and asks not to be used for similar products).

### Sources
| Source | License | Use |
|---|---|---|
| `simple-icons` (npm) | CC0 | Backbone: slugs, aliases, brand hex, guidelines URL; monochrome fallback art. |
| `@iconify-json/logos` (npm) | CC0 | Primary full-colour art. |
| `devicon` (npm) | MIT | Colour art for languages/dev tools. |
| `pheralb/svgl` (git, pinned commit) | MIT | Modern SaaS/AI brands, light/dark variants, wordmarks. |

Excluded: unixstickers/foss-swag-designs (CC BY-NC-ND), worldvectorlogo (no license).

### Script: `pnpm catalog:build` (`scripts/catalog/`)
1. Load each source into a common intermediate shape.
2. Merge by identity: match on normalized title + simple-icons slug + aliases + explicit overrides in `catalog/curation.json`.
3. Pick art per logo by preference order (svgl → iconify logos → devicon → simple-icons mono), overridable per logo.
4. Optimize with svgo; normalize viewBox; reject SVGs > 30 KB.
5. Assign tier: `curated` (in `curation.json` include list, target 500–800 logos) or `extended`.
6. Emit `catalog/logos.json` (metadata) and `public/logos/<id>/<variant>.svg`.
7. Validate (Vitest): unique ids, every referenced file exists, every curated logo has colour art, categories from the fixed list.

### Logo record
```ts
type Logo = {
  id: string;                 // toKey slug (lowercase alnum, no hyphens), e.g. "nextjs", "visualstudiocode"
  title: string;              // "Next.js"
  categories: Category[];     // fixed list below
  aliases: string[];
  hex?: string;               // brand colour
  brandUrl?: string;          // official brand guidelines
  tier: "curated" | "extended";
  source: "svgl" | "iconify-logos" | "devicon" | "simple-icons";
  art: {
    icon: { light: string; dark?: string };      // paths under /logos
    wordmark?: { light: string; dark?: string };
    mono: string;                                // simple-icons path, always present when available
  };
};
```

`Category` (fixed): `ai`, `cloud`, `hosting`, `framework`, `library`, `language`, `database`, `devtools`, `testing`, `design`, `os`, `editor`, `crypto`, `social`, `company`, `community`. Source categories are mapped onto this list in `scripts/catalog/categories.ts`; unmapped → `company`.

### Mapping tables (`catalog/mappings/*.json`) — contribution-friendly
Plain JSON `{ "<key>": "<logoId>" }` files: `npm.json`, `pypi.json`, `cargo.json`, `go.json`, `rubygems.json`, `languages.json` (GitHub linguist names), `topics.json` (repo topics). Scoped/prefix rules supported via `"@supabase/*": "supabase"`. Seeded from simple-icons/devicon slugs plus top packages per ecosystem; validated so every value is a real logo id. Auto-fill misses link to "Missing your tool? Open a PR".

## 5. Laptop model

Lid dimensions (mm), rendered at true scale (all sticker geometry stored in mm):

| Model | Lid W × H (mm) |
|---|---|
| MacBook Air 13" | 304.1 × 215.0 |
| MacBook Air 15" | 340.4 × 237.6 |
| MacBook Pro 14" | 312.6 × 221.2 |
| MacBook Pro 16" | 355.7 × 248.1 |

Colours: Space Black, Silver, Space Gray, Midnight, Starlight (finish = gradient + subtle noise + edge highlight + rounded corners). **No Apple logo** on the lid.

## 6. Editor (Framer-style)

Visual language follows Framer's editor, kept in svgl's neutral Geist palette: full-bleed canvas with a subtle dot grid, **floating rounded panels** (rounded-xl, 1px neutral border, soft shadow, light/dark) instead of docked sidebars, compact segmented controls, and spring motion everywhere (`motion` library).

- **Top bar (floating, centred):** name, tools (Move, Hand), ✨ Auto-fill from GitHub, Shuffle ("mess it up"), Tidy, Undo/Redo, laptop model/colour popover, Share, Export.
- **Left panel (floating, collapsible):** Assets — search, Favorites, category chips, virtualized logo grid; drag onto lid or click to add.
- **Canvas:** laptop centred; zoom (⌘ +/−, pinch, wheel) and pan (space-drag / Hand); floating zoom control bottom-right; selection with rotate + resize handles; multi-select (shift-click, marquee); snapping to lid centre/edges and other stickers.
- **Right properties panel (floating, springs in on selection, hidden otherwise):** sections *Sticker* (logo, variant icon/wordmark/mono, theme light/dark when available), *Style* (shape Die-cut/Circle/Hex/Square segmented control, holographic toggle), *Layout* (size in inches or cm, rotation, X/Y), actions (Duplicate, Delete). Multi-select edits shared fields.
- **Motion:** spring-animated panels and selection; peel-and-stick on place/lift (lift = scale up + rotate slightly + larger shadow; place = settle with small overshoot); auto-fill drops stickers in one by one; Shuffle animates stickers to new positions. Respects `prefers-reduced-motion`.
- **No layers panel.** Z-order via `[` / `]` and right-click menu (Bring to front, Send to back, Duplicate, Delete).
- **Shortcuts:** ⌘Z / ⇧⌘Z, ⌘D, Delete/Backspace, arrows (nudge 1mm, ⇧ 10mm), `[` `]`, ⌘A, Esc.
- Current layout autosaved to localStorage (try/catch; works without it).
- **Mobile:** canvas + bottom sheet for assets/properties; good enough for viewing share links and light edits.

### Layout state
```ts
type Sticker = {
  id: string; logoId: string;
  variant: "icon" | "wordmark" | "mono";
  theme: "light" | "dark";
  shape: "diecut" | "circle" | "hex" | "square";
  holo: boolean;
  x: number; y: number;        // centre, mm from lid top-left
  w: number;                   // width in mm (height from art aspect)
  rot: number;                 // degrees
};
type Layout = { v: 1; laptop: { model: LaptopModel; color: LaptopColor }; stickers: Sticker[] }; // array order = z-order
```

## 7. Rendering (one renderer, three consumers)

`lib/render/` exposes pure functions that turn `Layout` + catalog into SVG:
- `renderSticker(sticker, logo)` — art + shape: die-cut = white offset outline of the art (morphology dilate filter in editor; precomputed offset path/stroke for static output), circle/hex/square = white shape with padding; soft drop shadow; vinyl sheen gradient; holographic = animated iridescent gradient + cursor-follow highlight (editor only), static iridescent gradient in exports.
- `renderLaptop(layout, catalog, opts)` — lid + stickers → SVG string.

Consumers: editor (React components built on the same primitives), server PNG (`resvg`) for OG/README images, client PNG/PDF export. Visual parity between editor and exports is a requirement; snapshot tests guard the static renderer.

## 8. GitHub auto-fill

### `GET /api/github/[username]` (Node route handler)
1. `GET /users/{u}/repos?type=owner&sort=pushed&per_page=100` → drop forks/archived; keep 20 most recently pushed.
2. Per repo (parallel, bounded concurrency 6): `GET /repos/{o}/{r}/languages`; for the 12 most recent also `GET /repos/{o}/{r}/dependency-graph/sbom` (SPDX 2.3; package names parsed from `externalRefs` purls, e.g. `pkg:npm/next`). Repo topics come from the repo list.
3. Map languages, purls (ecosystem + name), and topics through mapping tables → logo ids.
4. Score: Σ over repos of (signal weight: dependency 3, topic 2, language ∝ bytes share) × recency decay (half-life 180 days since push). Return top 25 logo ids with scores, plus `unmatched` top packages (for "open a PR" hints).
- Auth: server `GITHUB_TOKEN` (5,000 req/h). Max ~33 calls per uncached scan.
- Cache: Next `"use cache"` / data cache, 24h per username (lowercased). Vercel CDN `s-maxage` on the response.
- Errors: unknown user → 404 "No GitHub user named X"; GitHub rate limit → 429 with retry hint; zero matches → fall back to top languages; SBOM 404/403 per repo → skip silently.

### Auto-layout: `autoLayout(scoredLogos, laptop, seed) → Sticker[]`
Pure, deterministic (seeded PRNG; seed = username) so `/<user>`, its OG image and `/<user>.png` always match. Rank → size tiers (top 3 ≈ 70–80mm, next ≈ 50–60mm, rest ≈ 35–45mm); shape mix weighted to die-cut; rotation ±12°; placement via best-candidate sampling with collision radii allowing ≤10% overlap and a small edge margin; looks hand-placed, not gridded. Same function powers Shuffle.

## 9. Sharing & export

- **Share link:** `Layout` → compact tuple form → lz-string → `/s?d=...`. Decoder validates (zod) and drops unknown logo ids. Version field `v` for forward compatibility.
- **OG images:** `/api/og?d=` and `/api/laptop/[username]` render via `renderLaptop` + resvg, 1200×630 (OG) / 1280×900 (README). Cache-Control: immutable for `d=` (content-addressed), 24h for usernames.
- **README snippet** shown on `/<username>` with copy button: `![my laptop](https://stackstickers.dev/<user>.png)`.
- **Export menu:** PNG mockup (2×/4×, client-side canvas), Print sheet PDF (stickers laid out on Letter/A4 at true size, 3mm gap, 300dpi raster fallback for unsupported art), copy share link.

## 10. Catalog page details

Loads `logos.json` (curated by default; "Show all" toggle includes extended). Fuse.js search over title + aliases. Sidebar categories with counts + Favorites. Favorites: `localStorage["ss:favorites"]` (array of ids; try/catch, in-memory fallback). Downloads generated client-side from the same renderer (sticker SVG/PNG) or the raw file. Each card links to brand guidelines when known.

## 11. Project structure

```
app/                     # routes (landing, stickers, editor, s, [username], credits, api/*)
components/ui/           # shadcn
components/{landing,catalog,editor,laptop,sticker}/
lib/render/              # pure SVG renderer
lib/layout/              # types, autoLayout, encode/decode, PRNG
lib/github/              # fetchers, sbom parsing, scoring
lib/catalog/             # loaders, search, favorites
catalog/                 # logos.json, curation.json, mappings/*.json (committed)
public/logos/            # vendored SVGs (committed)
scripts/catalog/         # build pipeline
tests/                   # vitest + playwright
```

## 12. Testing

- **Vitest:** catalog validation; mapping lookup incl. scoped wildcards; SBOM purl parsing (fixtures from real responses); scoring; autoLayout determinism + no-out-of-bounds + overlap bound; layout encode/decode round-trip + garbage input; renderer SVG snapshots; favorites storage with throwing localStorage.
- **GitHub fetch** tested with recorded fixtures (no live calls in CI).
- **Playwright smoke:** each route renders; add sticker → share → open share link shows same stickers; `/api/laptop/<fixture-user>` returns PNG.

## 13. Build phases

1. **Foundation + catalog pipeline + `/stickers`.** Next app scaffold, svgl-style design system, catalog build, catalog page with search/favorites/downloads.
2. **Editor + realism + sharing.** Renderer, laptop models, Framer-style editor, share links, OG images, export.
3. **GitHub auto-fill + README image.** Scan API, mapping tables, scoring, autoLayout, `/<username>`, `/<username>.png`.
4. **Landing + credits + launch polish.** Scattered-sticker landing, credits/takedown, metadata, Playwright suite, deploy to Vercel.

## 14. Legal

Credits page lists each source and license. `TRADEMARKS.md` + footer disclaimer: logos are trademarks of their owners, shown for identification, no affiliation or endorsement, nothing sold. Takedown: GitHub issue template or email; removal = add id to `curation.json` blocklist and rebuild.
