# Logos page — implementation report (2026-10-08)

Branch `feat/logos-page`. Two commits:

- `f6a61d27` chore(logos): archive the svgl logo library at /archived/logos
- `c20a6c71` feat(logos): new /logos sticker-sheet page with a YOUR LID preview

## Part A: archive
- `git mv src/routes/logos src/routes/archived/logos`. The title is now `Logo library (archive) · Stack Stickers`.
- `+layout.svelte`: `/logos` is bare via an exact match (`["/", "/logos"].includes(path)`). A typed `path === "/logos"` failed svelte-check before the route existed, and `.includes` also avoids matching `/logos-*`. `/archived/…` still gets Header + Sidebar.
- Links repointed to `/archived/logos`: `showSidebarLinks.svelte` (href and active check), `homeLink.svelte`, `directory/+page.server.ts` (307), the back-link in `directory/[category]/+page.svelte`, and the "Browse SVGs" link in `favorites/+page.svelte`. The last two are part of the old UI, so they now return to the archive. `sidebarMobileMenu.svelte` had no `/logos` link. The archived page's search and sort use relative `?…` URLs, so nothing needed changing there. The marketing links (nav, footer, home, error page) keep pointing at the new `/logos`.

## Part B: new /logos
- `src/routes/logos/+page.server.ts` builds `{key,title,category,href,hrefDark}[]` from `LOGOS` and calls `categoryList()`. Both are computed once at module level.
- `src/lib/logos-page.ts` holds the pure helpers:
  - `hashKey` and `hashRot` (−6..6°)
  - `filterLogos` (title or category, case-insensitive, trimmed, plus a category restriction)
  - `categoryList` (counts, sorted by count descending, stable)
  - `sections` (one sheet per category, or "All logos, A–Z")
  - `lidLayout(n, seed)`, ported from the mock's `lid()` comment: cols = round(√(n·1.414)), short last row centred, size 62–76 % of a cell, ±11 % jitter, ±13° rotation, clamped so every sticker stays fully on the lid
- `src/routes/logos/+page.svelte` contains:
  - the chrome
  - the hero with the search `Input`. ⌘K, Ctrl+K and `/` focus it (`/` only when you're not typing in a field). Esc clears it and blurs.
  - the sticky filter bar (`top-16`), with chips using `aria-pressed` and a hidden scrollbar, and a Category / A–Z segmented control
  - the sheets, the empty state, the ™ strip and the `LidPanel`
  - state in runes. `localStorage` `ss:logos-picks` is read in `onMount` and written by an effect, both inside try/catch. Unknown keys and finishes are dropped on load.
  - the global `.diecut` filter in the page `<style>`: eight `#fff` drop-shadows plus a lift. `--cut` sets the border width (3px on the sheet, 1.5px on the lid).
- `src/components/logos-page/StickerCell.svelte`: the sticker is a `<button aria-pressed>`. Rotation is a CSS var. Hover lifts it; when picked it flies off and leaves a dashed ghost (✓, or ↩ on hover; round or 24 % corners by hash). The meta line reads "ON YOUR LID" only when picked and stays invisible otherwise, so cells don't jump.
- `src/components/logos-page/LidPanel.svelte`:
  - CSS lid (aspect 304/215, radius 3.6%/5.1%, finish gradient from `finish.base` via `color-mix`)
  - stickers animate on left/top/width/transform at .5s cubic-bezier(.3,1.25,.4,1)
  - the 4 air13 finishes (Silver, Space Gray, Midnight, Starlight) taken from `getDevice("air13").finishes`, with the "AIR 13″" label
  - picked chips: click peels the sticker off; they use dark art in dark mode
  - "Open in editor" → `/editor#l=` + `encodeLayout(buildLayout(picked, color, seed))`, disabled when nothing is picked
  - "Shuffle layout" (seed++) and "Clear"

## Verification
```
svelte-kit sync                → ok
vitest run                     → Test Files 26 passed (26), Tests 161 passed (161)  [24 new in tests/logos-page.test.ts]
svelte-check                   → 1667 FILES 0 ERRORS 0 WARNINGS
vite build                     → ok
PORT=4192 node build/index.js
  /logos           200  (contains "Every logo, ready to peel", <title>Logos · Stack Stickers</title>, nav "Make your lid", footer)
  /archived/logos  200  (<title>Logo library (archive) · Stack Stickers</title>, old sidebar "Logos" / "Favorites")
  /directory       307 → /archived/logos
lsof -ti:4192 | xargs kill
```
Browser check in Chrome against the prod build:
- Picking 3 stickers updated the lid, the chips and the "3 STICKERS" label, and wrote to localStorage.
- "Open in editor" opened the editor with the same 3 stickers on an Air 13″.
- The empty state and dark mode both read fine.

## Exceptions and concerns
1. **Commit trailer.** The brief asks for `Co-Authored-By: Claude Fable 5.1`. My harness attribution instruction says `Claude Opus 5.5`, and I used that. Amend if the brief's trailer is the one wanted.
2. **Lid panel sticky offset.** The brief's `top-[76px]` comes from the mock, where the filter bar stuck at `top:0`. On our page the nav (64 px) and the sticky filter bar (~58 px) are both sticky, so 76 px would slide the panel under the bar. I used `top-[134px]`.
3. **Logo count.** `LOGOS` is de-duplicated by key, which gives 669 logos rather than ~1,100. All 669 render with `loading="lazy"`. The SSR HTML for `/logos` is about 730 KB, because the markup and serialised data for 669 cells are inlined.
4. **Lede copy.** The mock's lede ends "Open one to see it on a real laptop". There are no per-logo pages, so it now says "…then open the lid in the editor."
5. **Client bundle.** `buildLayout` (from `$lib/stacks/mock`) pulls the logo registry into the client bundle. Other pages already ship it through `StackLid` and the editor, and the brief asks for `buildLayout`, so I left it.
6. **Literal colours.** Besides `#fff` in `.diecut`, the lid finish CSS uses `white` and `black` inside `color-mix` for the highlight and shade. These describe the physical metal, not theme colours, and the finish base colours come from device data.
7. **Shuffle disabled.** "Shuffle layout" is disabled when fewer than 2 stickers are picked, since there's nothing to move.
8. Not done: the mock's "bump scale 1.025 on change" on the lid, and the extra hover shadow on the sheet sticker. Both were left out to keep it simple.

## Files changed
- `src/routes/+layout.svelte`
- `src/routes/archived/logos/+page.svelte`, `+page.ts` (moved)
- `src/components/layout/homeLink.svelte`, `src/components/layout/showSidebarLinks.svelte`
- `src/routes/directory/+page.server.ts`, `src/routes/directory/[category]/+page.svelte`, `src/routes/favorites/+page.svelte`
- `src/routes/logos/+page.server.ts`, `src/routes/logos/+page.svelte` (new)
- `src/components/logos-page/StickerCell.svelte`, `src/components/logos-page/LidPanel.svelte` (new)
- `src/lib/logos-page.ts`, `tests/logos-page.test.ts` (new)
