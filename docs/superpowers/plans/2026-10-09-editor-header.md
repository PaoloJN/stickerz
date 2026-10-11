# Editor header from the mock (2026-10-09)

Scope: **only `src/components/editor/EditorHeader.svelte`** plus the small server bits it needs. Do not touch the canvas, panels, dock or export dialog. Vocabulary: a saved thing is a **design**; "stack" only ever means a tech stack. Never say "lid" in UI.

Mock: `docs/design/Stack Stickers Editor.dc.html` → the `<header>` element only (44 px, 3-column grid: left app menu + undo/redo, centre breadcrumb + name + switcher, right preview/?/Share/Export). The mock's menus:
- App menu (svgl mark + chevron, `w-55`): `New design ⌘N`, `Duplicate design`, `Open recent… ⌘O`, ─, `Browse the community`, `Submit a logo ↗`, ─, `Keyboard shortcuts ?`.
- Switcher (chevron next to the name, 260 px popover centred under the name): mono heading `YOUR DESIGNS`, one row per design (colour swatch of the finish, name, meta "N stickers · edited …", check on the current one), ─, `+ New design ⌘N`.

## What to build (keep the current component as the base; it already has the app menu, undo/redo, name input, theme, preview, ?, Save, Share, Export)

1. **Back to My designs**: a ghost icon button (`ArrowLeft`, `aria-label="Back to My designs"`, title the same) as the very first element on the left, `href="/designs"`. Also make the breadcrumb "My designs" text a link to `/designs`.
2. **Site name + version in the app menu**: first row of the dropdown is a non-interactive label: `Stack Stickers` (font-medium) + a mono chip `v{siteConfig.version}` (muted). Add `version: "0.1.0"` to `siteConfig` in `src/config/site.ts` (that is the only edit allowed in that file). Then the items from the mock, in that order. Keep the existing "Submit a logo" (upstream link) and "Keyboard shortcuts" behaviour. "Browse the community" → `/community`. Remove "Browse svgl".
3. **New design (⌘N)**: navigate to a fresh editor. If the current design is unsaved and has edits (`!editor.savedId && editor.rev > 0`), `confirm("Start a new design? Unsaved changes will be lost.")` first. Implementation: `location.assign("/editor")` when already on `/editor` (a plain `goto` to the same route does not remount); otherwise `goto("/editor")`. The autosave keepalive flush on `pagehide` covers saved designs.
4. **Duplicate design**: `POST /api/stacks` with `{ name: name + " copy", layout: $state.snapshot(editor.layout) }` (same call the My designs page makes), then `goto(`/editor?id=${id}`)`; toast on failure (`svelte-sonner` `toast` is already used in the app).
5. **Open recent… (⌘O)** opens the switcher popover (same one as the chevron).
6. **Switcher popover** (`Popover` from `@/components/ui/popover`, `w-[260px]`): on open, `fetch("/api/stacks")` (new GET, below) and list the owner's designs newest-edited first; row click → if it's the current design just close; else `goto(`/editor?id=${id}`)` with the same unsaved-check as New. Swatch: the finish base colour via `getFinish(getDevice(layout.laptop.model), layout.laptop.color).base` — the GET returns `model` and `color` so the client can compute it; show a 14 px rounded square. Empty state: "No saved designs yet." Loading state: three skeleton rows (`bg-muted animate-pulse`). Keyboard: items are buttons; Esc closes.
7. **Keyboard shortcuts**: add `⌘N` (new) and `⌘O` (open recent) to the existing `keydown` handler (respect inputs/dialogs like the current code does) and to the `SHORTCUTS` list.
8. Keep Save / Share / Export exactly as they are. Keep the theme toggle. Keep dark-mode classes consistent with the file's existing `neutral-*` scheme (this component predates the semantic-token rule; stay consistent with the file rather than mixing).

## Server
- `src/routes/api/stacks/+server.ts`: add `GET` → `json(await listMine(locals.ownerId).then(list => list.map(s => ({ id: s.id, name: s.name, count: s.count, edited: s.edited, model: s.layout.laptop.model, color: s.layout.laptop.color }))))`. Check `GalleryStack`'s real field names in `src/lib/server/stacks.ts` and use those. Owner-scoped by the cookie; nothing else changes.
- Test: `tests/server/stacks-list.test.ts` — unit-test a tiny pure `toRecent(stacks)` mapper in `src/lib/server/recent.ts` (sorting newest first, field projection) rather than the endpoint.

## Verify
`./node_modules/.bin/svelte-kit sync && ./node_modules/.bin/vitest run && ./node_modules/.bin/svelte-check --tsconfig ./tsconfig.json && ./node_modules/.bin/vite build`; then `./node_modules/.bin/vite preview --port 4194 &` and, with a browser (claude-in-chrome / gstack) or at least curl: `/editor` 200, `GET /api/stacks` returns `[]` or a list (cookie-scoped), menus render. Kill by port. Never `pkill`. Commit with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

Report to `docs/superpowers/plans/2026-10-09-editor-header-report.md`; reply with Status, commits, one-line test summary, concerns, report path.
