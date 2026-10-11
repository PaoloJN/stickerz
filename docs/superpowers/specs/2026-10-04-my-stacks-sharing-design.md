# My stacks + sharing — design

**Date:** 2026-10-04
**Status:** Approved (conversational design) — pending spec review
**Depends on:** existing Neon + Drizzle layer (`stacks` table, gallery/shared read paths with mock fallback)

## Intent

The editor can build a stack; make the surrounding pages *real*:
- A user can **Save** a stack and see it in **My stacks**.
- A user can **Share** a stack as a persistent link (`/stack/[slug]`) with a visibility choice.
- A user can **Remix** someone else's stack into their own.

**Who it's for:** anyone, with **no login** — this is a playful, shareable creative tool and a login wall would kill casual use.

**Success:** from the editor I can Save a stack, see it in My stacks, set it Public and get a link that opens the read-only shared page; another browser can open that link and Remix it; My stacks shows only *my* stacks.

## Key decisions (agreed)

1. **Ownership = anonymous device id.** No accounts. A server-set httpOnly cookie identifies the owner. Upgradeable to real accounts later by linking `owner_id` → a user with no rewrite.
2. **Explicit Save, separate Share.** Save stores/updates the stack (private by default); Share sets visibility and exposes the link. Saving ≠ publishing.
3. **Approach A** — httpOnly owner cookie + SvelteKit server endpoints enforce ownership (the client cannot spoof the owner id).
4. Share **defaults to Unlisted** (link-only); Public (gallery) is opt-in.
5. **Remix** opens a copy in the editor (saved to the remixer's My stacks on Save) and bumps the source's `remixCount`.

**Honest limitation (accepted):** "My stacks" is really *this browser's* stacks — clearing cookies or switching devices loses the private list (shared stacks survive by URL). Copy must not imply permanent cloud storage.

## 1. Data model

Extend the existing `stacks` table:
- `ownerId text not null` — anonymous owner id. Index `(ownerId, updatedAt desc)` for My stacks.
- `id` (slug) becomes unique-per-stack: `slugify(name) + "-" + nanoid(4)` → e.g. `frontend-2026-8f3k`.
- `author`: on **create**, set to `handleFor(ownerId)` — a generated stable handle (deterministic adjective-noun, e.g. `swift-otter`). No handle UI in v1. Existing seed rows keep their hand-authored names (maya/theo/…); the column type is unchanged.
- Keep: name, model, color, layout (jsonb), visibility (`private|unlisted|public`), stickerCount, remixCount, createdAt, updatedAt, and the gallery index.

**Migration:** add `ownerId` (+ index); backfill existing seed rows to owner `"seed"` so they remain in the gallery but in nobody's My stacks. Re-seed uses owner `"seed"`.

## 2. Owner identity

- New `src/hooks.server.ts`: if the request has no `owner_id` cookie, mint `crypto.randomUUID()` and set it httpOnly, Secure, SameSite=Lax, path=/, maxAge ~2yr. Expose `event.locals.ownerId`.
- `src/app.d.ts`: add `interface Locals { ownerId: string }`.
- `handleFor(ownerId): string` — deterministic display handle (pure, unit-tested).

## 3. Mutations (server, ownership-enforced)

JSON endpoints under `src/routes/api/stacks/`, each reading `locals.ownerId`:
- `POST /api/stacks` → create (visibility `private`); body `{ name, layout }`; returns `{ id }`.
- `PUT /api/stacks/[id]` → update `{ name?, layout? }`; **403 unless owner matches**.
- `DELETE /api/stacks/[id]` → owner only.
- `POST /api/stacks/[id]/visibility` → `{ visibility }`; owner only.
- `POST /api/stacks/[id]/remix` → increment `remixCount` (no ownership needed).

Query helpers in `src/lib/server/stacks.ts` (extend existing): `createStack(ownerId, {name,layout})`, `updateStack(id, ownerId, patch)`, `deleteStack(id, ownerId)`, `setVisibility(id, ownerId, vis)`, `listMine(ownerId)`, `getOwned(id, ownerId)`. Ownership check lives in one place (`canEdit`/`getOwned`), unit-tested. When `db` is null (no DATABASE_URL), mutations are no-ops/4xx and `listMine` returns `[]` (fallback safety; DB is provisioned).

**Validation:** layout runs through `sanitizeLayout` (codec.ts) before persisting; name capped at `MAX_NAME` (60); reject oversized payloads.

## 4. Editor integration

`EditorState` gains `savedId: string | null` and dirty tracking.
- **Save** (EditorHeader): `savedId` → `PUT`, else `POST` then store `savedId`. Toast on success.
- **Share** (repurpose existing dialog): visibility toggle (Private/Unlisted/Public) calling the visibility endpoint, plus the persistent `${origin}/stack/${id}` link. If unsaved, Save first.
- **Open for editing:** `EditorShell` onMount — `?id=<slug>` fetches the owner's stack and loads it (sets `savedId`); `#l=` loads a copy (remix, no `savedId`). Unsaved work keeps today's localStorage draft.

Files touched: `editor.svelte.ts`, `EditorShell.svelte`, `EditorHeader.svelte`, `ExportDialog.svelte` (share tab), `actions.ts`.

## 5. My stacks page

- `src/routes/stacks/+page.server.ts` → `listMine(locals.ownerId)` (replaces mock).
- Per-card **⋯ menu** (shadcn `dropdown-menu`): Open (`/editor?id=`), Rename (→ PUT), Duplicate (→ POST from layout), Copy link (`/stack/[id]`), Change visibility (→ POST), Delete (→ DELETE). Actions call endpoints and `invalidate` the load.
- Real empty state ("No stacks yet — open the editor"). Search box stays visual in v1.

## 6. Remix flow

Gallery/shared **Remix** → navigate to `/editor#l=<encodeLayout(layout)>` (opens an unsaved copy) and fire-and-forget `POST /api/stacks/[id]/remix`. The copy enters My stacks when the user Saves.

## 7. Error handling

- Endpoints: 400 (bad body/validation), 403 (not owner), 404 (missing), 200/201 on success. Editor surfaces failures via toast; never lose the local draft on a failed save.
- Owner cookie missing on a mutation (cookies disabled) → 400 with a clear message.

## 8. Testing

- Unit (vitest, pure): `slugify` + uniqueness suffix, `handleFor` determinism, ownership check (`canEdit`/`getOwned` rejects non-owner).
- Endpoint happy-paths verified against the live Neon dev DB (create → listMine → setVisibility → shared page → delete).
- Existing codec/layout tests cover `sanitizeLayout`.

## Out of scope (v1)

Real accounts/login, cross-device sync, account linking, handle renaming, moderation/rate-limiting, trash/soft-delete, My-stacks search & sort.
