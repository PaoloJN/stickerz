# Stack Stickers — Editor on svgl (Design Spec v2)

- **Date:** 2026-10-04
- **Status:** Approved
- **Supersedes:** `2026-10-04-stack-stickers-design.md` for architecture. That doc still holds the product vision, GitHub auto-fill, sharing and export ideas. The previous Next.js attempt lives in `delete/`, kept for reference.

## 1. Decision

The repo is a fork of **pheralb/svgl** (SvelteKit 2, Svelte 5 runes, Tailwind v4, shadcn-svelte/bits-ui, MIT), merged at the root with remote `upstream`.

- svgl stays **as-is**: catalog, search, favorites, copy/download, API.
- We build **only the sticker editor** on top of it.
- Cleanup, restyling and removing unused svgl parts come later.
- Keep the diff to svgl files minimal so `git merge upstream/main` stays easy.

## 2. Scope

### Phase E1 (this plan) — the editor
- **Route:** `/editor`, full-screen. It has no svgl header or sidebar; the root layout skips them for `/editor*`.
- **Canvas:** a true-to-scale MacBook lid rendered as SVG, with all geometry in mm.
  - Air 13: 304.1 × 215.0 mm
  - Air 15: 340.4 × 237.6 mm
  - Pro 14: 312.6 × 221.2 mm
  - Pro 16: 355.7 × 248.1 mm
  - Colours: Space Black, Silver, Space Gray, Midnight, Starlight.
  - No Apple logo.
- **Stickers:** logos from svgl's `src/data/svgs.ts`, about 670.
  - Art is drawn with `<image href="/library/…">`, never inlined, so community SVGs can't inject markup or CSS.
  - Shapes: die-cut (white outline via feMorphology filter), circle, hex, square.
  - Variant: icon or wordmark (when available).
  - Theme: light art on a white sticker, or dark art on a black sticker (when a dark route exists).
  - Holographic toggle; soft shadow plus vinyl sheen.
- **Editor UX (Framer-style):**
  - **Top bar** (floating, centred): back to catalog, laptop model/colour popover, undo/redo, Shuffle, Clear, Share, Export PNG.
  - **Left floating panel:** logo search (svgl's Fuse search), Favorites tab (svgl favorites store), click or drag to add.
  - **Right floating panel:** appears on selection with shape, variant, theme, holo, size (cm), rotation, Duplicate, Delete, and Bring forward / Send back.
  - **Canvas:** select, move, rotate handle, corner resize (keeps aspect), click empty space to deselect. Zoom with ⌘±/wheel, pan with Space-drag.
  - **Shortcuts:** ⌘Z / ⇧⌘Z, ⌘D, Delete/Backspace, arrows (1mm, ⇧ 10mm), `[` `]`, Esc.
  - **Motion:** peel-and-stick on add/lift via Svelte springs (lift = scale 1.06, extra shadow; place = settle). Respects reduced motion.
- **Persistence:** autosave to localStorage (`ss:layout`, try/catch). Share link = layout compressed into the URL hash (`/editor#l=…`, lz-string). Unknown logo keys are dropped on load.
- **Entry points into svgl's UI (small diffs):**
  - "Add to laptop" icon button on `svgCard.svelte`, linking to `/editor?add=<key>`.
  - "Editor" link in svgl's sidebar links.
- **Export:** PNG mockup at 2×, client-side. Logo images are inlined as data URIs only inside the exported image.

### Later phases (unchanged intent, re-planned when reached)
- **E2:** print-sheet PDF, OG/share image (server render), short links.
- **E3:** GitHub auto-fill (SvelteKit server route, package→logo mapping, autoLayout), `/<user>` page, README PNG.
- **E4:** landing page, cleanup of unused svgl parts (API service, extensions, docs, registry), restyle, credits/trademark page.

## 3. Logo identity

svgl entries have no slug, and their numeric index changes as logos are added.

- `logoKey(svg)` = basename of the light icon route without `.svg` and without a trailing `-light`/`-dark`/`_light`/`_dark`. Example: `/library/nextjs_icon_dark.svg` → `nextjs_icon`.
- Keys must be unique across the dataset; a unit test asserts this.
- Collisions get resolved with an explicit override map in `src/lib/stickers/logos.ts`.

## 4. Data model (`src/lib/stickers/types.ts`)

```ts
type LaptopModel = "air13" | "air15" | "pro14" | "pro16";
type LaptopColor = "space-black" | "silver" | "space-gray" | "midnight" | "starlight";
type StickerShape = "diecut" | "circle" | "hex" | "square";
type Sticker = {
  id: string; logo: string;            // logoKey
  variant: "icon" | "wordmark"; theme: "light" | "dark";
  shape: StickerShape; holo: boolean;
  x: number; y: number;                // centre, mm from lid top-left
  w: number;                           // width mm; height derived from art aspect
  rot: number;                         // degrees
};
type Layout = { v: 1; laptop: { model: LaptopModel; color: LaptopColor }; stickers: Sticker[] }; // array order = z-order
```

## 5. Architecture

- `src/lib/stickers/` holds pure TS: types, laptop specs, logos adapter, geometry, history, layout codec, and storage. Unit-tested with **Vitest**, the only new dev tooling besides `lz-string`.
- `src/lib/stickers/editor.svelte.ts`: an `EditorState` class with runes (layout, selection, tool, zoom/pan, history). Persistence is wired here.
- `src/components/editor/*.svelte`: `EditorShell`, `TopBar`, `AssetsPanel`, `PropertiesPanel`, `Canvas`, `Laptop`, `StickerView`, `SelectionHandles`.
- Look: svgl's own tokens and shadcn-svelte components. Floating panels use `rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur shadow-lg`; the canvas background has a dot grid.

## 6. Testing

- **Vitest:** logoKey uniqueness, laptop specs, geometry (resize/rotate math, clamping), history (undo/redo bounds), codec round-trip plus garbage input, storage with throwing localStorage.
- **Checks:** `pnpm check` (svelte-check) and `pnpm lint` stay clean.
- **Manual browser pass** of the editor flows at the end of the phase, with screenshots.
