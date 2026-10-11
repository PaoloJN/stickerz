# Autosave + Owner Display Names Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make owned stacks autosave (local-first + debounced DB sync, Remix auto-creates), and replace generated author handles with an optional owner-chosen display name.

**Architecture:** The editor keeps its existing instant localStorage draft; for stacks that have a `savedId`, a debounced `$effect` PUTs changes to `/api/stacks/[id]` (dirty-checked via a commit-revision counter) and flushes on tab-hide/close with `fetch(..., {keepalive:true})`. Loading a `#l=` remix copy auto-creates the DB row (one POST). A new `owners(ownerId, displayName)` table holds an optional display name set on first publish; `stacks.author` uses it (fallback "anonymous"), and setting the name backfills the owner's existing stacks.

**Tech Stack:** SvelteKit (Svelte 5 runes), Drizzle + Neon, Tailwind v4 + shadcn, vitest.

**Spec:** this plan (design approved in-chat 2026-10-04: local-first + debounced sync; ask-for-a-name-once, optional).

## Global Constraints

- Svelte 5 runes only. Alias `@/` → `src/`, `$lib/` → `src/lib/`.
- All owner identity from `locals.ownerId` server-side; never trust client-supplied owner/author.
- Autosave writes ONLY stacks with a `savedId`; a brand-new untitled stack stays local until Save/Share/Remix. Debounce ≈ 3000ms; skip the PUT when nothing changed since the last sync.
- Runes files that aren't `.svelte` MUST be `.svelte.ts` (e.g. `save.svelte.ts`). Do not put `$state`/`$effect` in a plain `.ts`.
- Display name: optional; fallback is the literal "anonymous". No generated `handleFor` for display. visibility stays `private|unlisted|public`.
- DB writes go through `src/lib/server/*`; `pnpm` only runs db:* here, otherwise use `./node_modules/.bin/*`; `vite dev` EMFILEs — verify with `( ulimit -n 10240; ./node_modules/.bin/vite build )` + preview. Source `.env` (`set -a && . ./.env && set +a`) for DB commands/preview.

## Review Focus

- **Autosave write storm** — dragging/editing rapidly must collapse to ~1 PUT after you stop, not one per change (debounce + dirty-check). (Task 4.)
- **No autosave for unsaved scratch** — a stack with no `savedId` must never hit the DB from the autosave effect. (Task 4.)
- **No redundant PUT right after load** — loading `?id=`/`#l=` sets the layout; the autosave effect must not immediately re-PUT the just-loaded content. (Task 4 — sync the rev baseline on load.)
- **Lost last edit on close** — editing then closing the tab must flush (keepalive). (Task 4.)
- **Name backfill** — setting a display name must update the author on the owner's already-created stacks (so a stack created before naming shows the real name once shared). (Task 2.)

---

### Task 1: `owners` table + migration

**Files:** Modify `src/lib/server/db/schema.ts`; generate `drizzle/0002_*.sql`.

**Interfaces:** Produces `owners` table: `ownerId text pk`, `displayName text notNull`, `createdAt timestamptz default now()`.

- [ ] **Step 1:** Add to `schema.ts`:

```ts
export const owners = pgTable("owners", {
  ownerId: text("owner_id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type OwnerRow = typeof owners.$inferSelect;
```

- [ ] **Step 2:** `pnpm db:generate` → new `drizzle/0002_*.sql` creating the table.
- [ ] **Step 3:** `set -a && . ./.env && set +a && pnpm db:migrate` → "migrations applied".
- [ ] **Step 4:** Commit:

```bash
git add src/lib/server/db/schema.ts drizzle/
git commit -m "feat(db): owners table for display names"
```

---

### Task 2: owner-name server layer + author integration

**Files:** Create `src/lib/server/owners.ts`; modify `src/lib/server/stacks.ts` (`createStack` author).

**Interfaces:**
- Produces `getOwnerName(ownerId): Promise<string | null>`, `setOwnerName(ownerId, name): Promise<string>` (upserts owners, trims + caps name at 40, and backfills `stacks.author` for that owner; returns the stored name).
- `createStack` sets `author = (await getOwnerName(ownerId)) ?? "anonymous"`.

- [ ] **Step 1:** Create `src/lib/server/owners.ts`:

```ts
import { eq } from "drizzle-orm";
import { db } from "./db";
import { owners, stacks } from "./db/schema";

export const MAX_DISPLAY_NAME = 40;

export async function getOwnerName(ownerId: string): Promise<string | null> {
  if (!db) return null;
  const [row] = await db.select().from(owners).where(eq(owners.ownerId, ownerId)).limit(1);
  return row?.displayName ?? null;
}

/** Upsert the owner's display name and backfill it onto their existing stacks. Returns the stored name. */
export async function setOwnerName(ownerId: string, name: string): Promise<string> {
  if (!db) throw new Error("no-db");
  const clean = name.trim().slice(0, MAX_DISPLAY_NAME) || "anonymous";
  await db
    .insert(owners)
    .values({ ownerId, displayName: clean })
    .onConflictDoUpdate({ target: owners.ownerId, set: { displayName: clean } });
  await db.update(stacks).set({ author: clean }).where(eq(stacks.ownerId, ownerId));
  return clean;
}
```

- [ ] **Step 2:** In `src/lib/server/stacks.ts` `createStack`, replace `author: handleFor(ownerId)` with:

```ts
author: (await getOwnerName(ownerId)) ?? "anonymous",
```

Add `import { getOwnerName } from "./owners";`. Leave `handleFor` in `ids.ts` (unused for display now; harmless).

- [ ] **Step 3:** Typecheck: `./node_modules/.bin/svelte-kit sync && ./node_modules/.bin/svelte-check --tsconfig ./tsconfig.json --threshold error 2>&1 | grep -E "owners.ts|stacks.ts" || echo clean`.
- [ ] **Step 4:** Commit:

```bash
git add src/lib/server/owners.ts src/lib/server/stacks.ts
git commit -m "feat(server): owner display name (get/set + author backfill)"
```

---

### Task 3: owner-name API endpoint

**Files:** Create `src/routes/api/owner/+server.ts`.

**Interfaces:** Consumes `getOwnerName`/`setOwnerName` + `locals.ownerId`. Produces GET `{displayName: string|null}` and POST `{displayName}` → `{displayName}` (the stored, cleaned value).

- [ ] **Step 1:** Create `src/routes/api/owner/+server.ts`:

```ts
import { json, error } from "@sveltejs/kit";
import { getOwnerName, setOwnerName } from "$lib/server/owners";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.ownerId) error(400, "no owner");
  return json({ displayName: await getOwnerName(locals.ownerId) });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.ownerId) error(400, "no owner");
  const body = await request.json().catch(() => null);
  if (!body || typeof body.displayName !== "string") error(400, "bad body");
  try {
    return json({ displayName: await setOwnerName(locals.ownerId, body.displayName) });
  } catch {
    error(503, "could not save name");
  }
};
```

- [ ] **Step 2:** Verify against dev DB (build+preview, cookie jar): POST `{displayName:"Paolo"}` → `{"displayName":"Paolo"}`; GET → same; POST `{}` → 400.
- [ ] **Step 3:** Commit:

```bash
git add src/routes/api/owner
git commit -m "feat(api): owner display-name endpoint"
```

---

### Task 4: Autosave (debounced sync + flush)

**Files:** Modify `src/lib/stickers/editor.svelte.ts` (expose `rev`); modify `src/components/editor/save.svelte.ts` (`syncStack` + `installAutosave`); modify `src/components/editor/EditorShell.svelte` (wire lifecycle).

**Interfaces:**
- `EditorState` gains `get rev(): number` (returns the internal commit counter `#rev`, already incremented on every `#commit`).
- `save.svelte.ts` adds `installAutosave(editor): () => void` (sets up the debounced sync + flush listeners; returns teardown) and an internal `syncStack(editor, keepalive?)`.

- [ ] **Step 1:** In `editor.svelte.ts`, add a public getter near the other getters:

```ts
/** number of committed changes; autosave uses this as a cheap dirty signal */
get rev(): number {
  return this.#rev;
}
```

- [ ] **Step 2:** In `save.svelte.ts`, add (keep the existing `saveStack`):

```ts
/** Silent PUT of the current layout for an already-saved stack. keepalive lets it survive page unload. */
async function syncStack(editor: EditorState, keepalive = false): Promise<void> {
  if (!editor.savedId) return;
  const layout = $state.snapshot(editor.layout);
  const name = editor.layout.name ?? "My stack";
  try {
    await fetch(`/api/stacks/${editor.savedId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, layout }),
      keepalive,
    });
  } catch {
    /* local draft is intact; next change or reopen retries */
  }
}

/** Debounced autosave for owned stacks + flush on tab hide/close. Returns teardown + markSynced. */
export function installAutosave(editor: EditorState): { teardown: () => void; markSynced: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let syncedRev = editor.rev; // baseline: don't sync the already-loaded content
  const markSynced = () => { syncedRev = editor.rev; }; // call after a programmatic load (id/remix)
  const stop = $effect.root(() => {
    $effect(() => {
      const rev = editor.rev; // track
      if (!editor.savedId || rev === syncedRev) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const at = editor.rev;
        syncStack(editor).then(() => { syncedRev = at; });
      }, 3000);
    });
  });
  const flush = () => {
    if (editor.savedId && editor.rev !== syncedRev) {
      if (timer) clearTimeout(timer);
      syncedRev = editor.rev;
      void syncStack(editor, true);
    }
  };
  const onHide = () => { if (document.visibilityState === "hidden") flush(); };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", flush);
  const teardown = () => {
    if (timer) clearTimeout(timer);
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", flush);
    stop();
  };
  return { teardown, markSynced };
}
```

Note: after a programmatic load (the `?id=` fetch success in Step 3, and the Task-5 remix POST that sets `savedId`), call `markSynced()` so the just-loaded/just-created content isn't immediately re-PUT. The loaded content already matches the server.

- [ ] **Step 3:** In `EditorShell.svelte`, after the existing onMount `?id=`/`?add=` handling resolves, install autosave and return its teardown alongside the shortcuts teardown. Since the `?id=` fetch is async, install autosave immediately (it keys off `savedId`, which starts null and becomes set after load; the baseline-rev guard means the load's own commit won't PUT because `savedId` is still null at that commit and becomes set only after). To be safe, after setting `editor.savedId` in the `?id=` branch, do nothing else — the next USER edit bumps `rev` past the baseline and triggers the first sync. Wire:

```ts
const autosave = installAutosave(editor);
// in the ?id= fetch .then, AFTER `editor.savedId = data.id`: call autosave.markSynced();
// ...existing return:
return () => { removeShortcuts(); autosave.teardown(); };
```

(Task 5's remix POST `.then` must likewise call `autosave.markSynced()` after setting `editor.savedId` — carry this when implementing Task 5; the `autosave` handle is in scope.)

- [ ] **Step 4:** Verify: `./node_modules/.bin/svelte-kit sync && ./node_modules/.bin/svelte-check --tsconfig ./tsconfig.json --threshold error` clean; `( ulimit -n 10240; ./node_modules/.bin/vite build )` exits 0. Reason through (and state in the report) that: (a) an unsaved stack (`savedId===null`) never PUTs; (b) a burst of edits debounces to one PUT 3s after the last; (c) the load baseline prevents an immediate PUT.
- [ ] **Step 5:** Commit:

```bash
git add src/lib/stickers/editor.svelte.ts src/components/editor/save.svelte.ts src/components/editor/EditorShell.svelte
git commit -m "feat(editor): local-first debounced autosave for owned stacks"
```

---

### Task 5: Remix auto-create on `#l=` load

**Files:** Modify `src/components/editor/EditorShell.svelte`.

**Interfaces:** Consumes `createStack` via POST `/api/stacks`; sets `editor.savedId`.

- [ ] **Step 1:** In `EditorShell.svelte` onMount, after the `?id=` branch, add a remix branch: if there is NO `?id=`, no `savedId`, and `location.hash.startsWith("#l=")` (a remix/shared copy was loaded into the layout by the editor constructor), auto-create it so it becomes the user's own saved stack:

```ts
if (!id && !editor.savedId && location.hash.startsWith("#l=")) {
  fetch("/api/stacks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: editor.layout.name ?? "Remixed stack", layout: $state.snapshot(editor.layout) }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => { if (d?.id) editor.savedId = d.id; })
    .catch(() => {});
  history.replaceState(history.state, "", location.pathname + location.search); // drop #l=
}
```

Place this where `$state.snapshot` is valid (EditorShell is a `.svelte` file, so runes are fine). Ensure it runs only once (onMount).

- [ ] **Step 2:** Verify: svelte-check clean; build exits 0. In the report, reason that opening `/editor#l=<copy>` now POSTs once → `savedId` set → the Task-4 autosave then covers subsequent edits, and the source-count beacon (Task 8 of the prior feature) is unaffected.
- [ ] **Step 3:** Commit:

```bash
git add src/components/editor/EditorShell.svelte
git commit -m "feat(editor): remix auto-creates an owned copy"
```

---

### Task 6: First-publish display-name prompt in Share dialog

**Files:** Modify `src/components/editor/ExportDialog.svelte`.

**Interfaces:** Consumes GET/POST `/api/owner`.

- [ ] **Step 1:** In the Share tab, when it opens and the stack is (or becomes) saved, GET `/api/owner`. If `displayName` is null, show a small "Share as" text input + a "Use this name" button (and a "Skip" that proceeds as anonymous). On submit, POST `/api/owner` `{displayName}`; on success hide the field. Store the fetched/!null name in local `$state` so it only prompts once per session. Keep the rest of the Share tab (visibility control, persistent link) intact.

Sketch:

```svelte
<script> // additions
  let ownerName = $state<string | null | undefined>(undefined); // undefined = not fetched
  let nameDraft = $state("");
  async function loadOwnerName() { try { const r = await fetch("/api/owner"); if (r.ok) ownerName = (await r.json()).displayName; } catch { ownerName = null; } }
  async function saveOwnerName() {
    const r = await fetch("/api/owner", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: nameDraft }) });
    if (r.ok) ownerName = (await r.json()).displayName;
  }
</script>
```

Call `loadOwnerName()` when the share tab opens (in the existing share `$effect`). Render the "Share as" block only when `ownerName === null`. Do not block link/visibility on it (it's optional).

- [ ] **Step 2:** Verify: svelte-check clean; build exits 0; Download tab untouched. (Full click-through is the manual loop.)
- [ ] **Step 3:** Commit:

```bash
git add src/components/editor/ExportDialog.svelte
git commit -m "feat(editor): optional display-name prompt on first share"
```

---

## Done when

All 6 tasks committed; `svelte-check` clean; build green; a manual loop confirms: edit an owned stack → one debounced PUT after you stop; Remix a gallery stack → it appears in My stacks immediately; first Share prompts for a name (skippable) and the shared stack shows that name (or "anonymous"), never a generated handle.
