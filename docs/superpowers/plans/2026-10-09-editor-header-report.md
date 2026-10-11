# Editor header: report (2026-10-09)

Branch `feat/editor-header` (worktree `ss-wt-header`).

## What changed
- `src/components/editor/EditorHeader.svelte`
  - Back button (`ArrowLeft`, "Back to My designs") first on the left, links to `/designs`; breadcrumb "My designs" is now a link.
  - App menu: non-interactive label `Stack Stickers` + mono `v0.1.0` chip, then New design ⌘N, Duplicate design, Open recent… ⌘O, ─, Browse the community (`/community`), Submit a logo ↗, ─, Keyboard shortcuts ?. "Browse svgl" removed.
  - Switcher: chevron after the name opens a 260px popover anchored (`customAnchor`) under the breadcrumb/name group: `YOUR DESIGNS`, rows (finish swatch, name, "N stickers · edited …", check on `editor.savedId`), skeleton rows while loading, "No saved designs yet." when empty, ─, `+ New design ⌘N`. Fetches `GET /api/stacks` each time it opens.
  - ⌘N / ⌘O added to the keydown handler (same input/modal guards) and to `SHORTCUTS`.
  - Save / Share / Export / preview / ? untouched.
- `src/routes/api/stacks/+server.ts`: `GET` returns `toRecent(listMine(ownerId))`; `[]` with no owner cookie, 503 on DB failure.
- `src/lib/server/recent.ts`: `toRecent` mapper + `RecentDesign` type (`id, name, count, edited, model, color`).
- `tests/server/stacks-list.test.ts`: 3 tests for the mapper.
- `src/config/site.ts`: `version: "0.1.0"`.

## Deviations from the brief (adapted to the code)
1. **All design switches from /editor are full loads (`location.assign`)**, not just New. `EditorShell` reads `?id` only in `onMount`, so `goto("/editor?id=…")` from `/editor` would not load the design. `open()` uses `location.assign` on `/editor`, `goto` elsewhere.
2. **New design clears the local draft.** The editor restores its layout from `localStorage["ss:layout"]` on mount, so reloading `/editor` would bring the same design back. `newDesign()` calls `editor.flush()`, removes `LAYOUT_KEY`, then navigates. Saved designs are still synced by the autosave `pagehide` keepalive (it uses the in-memory layout).
3. **Unsaved check is `!savedId && (rev > 0 || stickers.length > 0)`.** A draft restored from storage has `rev === 0` but real content; the brief's `rev > 0` alone would drop it silently. Switching designs uses the same check with the message "Open another design? Unsaved changes will be lost."
4. **`toRecent` keeps order rather than sorting.** `GalleryStack` only has a display label (`edited: "2 hours ago"`), no timestamp; `listMine` already orders by `updated_at desc`. The test asserts the order is kept.
5. **Mock file missing**: `docs/design/Stack Stickers Editor.dc.html` is not in either checkout. I built from the brief's description.
6. **No theme toggle in this file on this branch** (`ThemeToggle.svelte` is untracked in the main checkout only), so there was nothing to keep.
7. Commit trailer follows the session's attribution rule (Opus 5.5), not the brief's "Fable 5.1".

## Verification
- `svelte-kit sync`; `vitest run` 216/216 pass (one earlier run had 1 failure that didn't come back in 5 reruns, so it looks like a pre-existing flake, not this change); `svelte-check` 0 errors / 0 warnings; `vite build` OK.
- `vite preview --port 4194`: `/editor` 200; `GET /api/stacks` with a new cookie → `[]`; after a POST with that cookie → one projected row; deleted the test row afterwards → `[]`.
- Browser (claude-in-chrome): the app menu renders with name + version and every item; Open recent… opens the switcher centred under the name, showing the existing design with swatch and meta. Server stopped by port.

## Concerns
- Chrome reserves ⌘N (new window) and the page can't stop it, so ⌘N may not reach the app in Chrome. The menu item and the switcher's "+ New design" still work. ⌘O does work.
- The DropdownMenu trigger didn't open from a synthetic ref click in the test browser, but a real click at the coordinates did. This matches the existing trigger, which I didn't change.
- "Duplicate design" leaves the original saved design's pending edits to the `pagehide` flush, same as New.
