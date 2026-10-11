# My stacks + Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make stacks real — save to Neon under an anonymous device owner, list them in My stacks, share with a visibility choice, and remix others' stacks.

**Architecture:** An httpOnly `owner_id` cookie (set in `hooks.server.ts`) identifies the anonymous owner; SvelteKit JSON endpoints under `/api/stacks` perform ownership-enforced mutations against the existing Neon/Drizzle `stacks` table; the client-only editor calls those endpoints to Save/Share and loads a saved stack via `?id=`. My stacks and the shared/gallery pages read through the existing server query layer.

**Tech Stack:** SvelteKit (Svelte 5 runes), Drizzle + Neon Postgres, Tailwind v4 + shadcn-svelte, vitest.

**Spec:** `docs/superpowers/specs/2026-10-04-my-stacks-sharing-design.md`

## Global Constraints

- Svelte 5 runes only (`$state`, `$derived`, `$props`). Import alias `@/` → `src/`, `$lib/` → `src/lib/`.
- All mutations are server-side and read the owner from `event.locals.ownerId` (never trust a client-supplied owner).
- Owner cookie: name `owner_id`, `httpOnly`, `secure`, `sameSite:"lax"`, `path:"/"`, `maxAge: 60*60*24*730`.
- Visibility is exactly `"private" | "unlisted" | "public"`; new stacks are `private`.
- Every persisted layout passes `sanitizeLayout` (from `$lib/stickers/codec`) first; name capped at `MAX_NAME` (60).
- Server DB code lives under `src/lib/server/` only. When `db` is null, mutations return 503 and `listMine` returns `[]`.
- No new runtime dependencies (generate slug suffixes with `crypto.getRandomValues`, not nanoid).

## Review Focus

- **Non-owner mutation** — a PUT/DELETE/visibility call for a stack owned by a different `owner_id` must return 403 and change nothing. (Task 3 tests `assertOwner`; Task 4 tests the endpoint.)
- **Missing owner cookie** — a mutation request with no `owner_id` (cookies disabled) must return 400, not throw. (Task 4.)
- **Invalid/oversized layout body** — a POST/PUT whose `layout` fails `sanitizeLayout` must 400 and write nothing. (Task 4.)
- **Slug collision** — two stacks named "My stack" must get distinct ids; `makeId` appends a random suffix. (Task 3.)
- **Remixing a non-accessible stack** — `POST /remix` must only increment for `public`/`unlisted` stacks; a `private` id returns 404. (Task 4.)

---

### Task 1: Schema — owner + migration + re-seed

**Files:**
- Modify: `src/lib/server/db/schema.ts`
- Modify: `src/lib/server/db/seed.ts`
- Create (generated): `drizzle/0001_*.sql`

**Interfaces:**
- Produces: `stacks.ownerId` column; index `stacks_owner_idx` on `(ownerId, updatedAt)`.

- [ ] **Step 1: Add the column + index to the schema**

In `schema.ts`, inside `pgTable("stacks", { ... }, (t) => [...])`:

```ts
// add to the columns object, after author:
ownerId: text("owner_id").notNull().default(""),
// add to the index array:
index("stacks_owner_idx").on(t.ownerId, t.updatedAt),
```

- [ ] **Step 2: Seed sets the owner**

In `seed.ts`, add `ownerId: "seed"` to each row object in the `rows` map, AND add `ownerId: stacks.ownerId`... no — add a literal to the `onConflictDoUpdate` set so already-seeded rows are backfilled too:

```ts
// in rows.map(...): add to each row
ownerId: "seed",
// in .onConflictDoUpdate({ set: { ... } }): add
ownerId: sql`excluded.owner_id`,
```

Add `import { sql } from "drizzle-orm";` at the top of `seed.ts`.

- [ ] **Step 3: Generate the migration**

Run: `pnpm db:generate`
Expected: a new `drizzle/0001_*.sql` adding `owner_id` + index.

- [ ] **Step 4: Apply + re-seed against dev DB**

Run: `set -a && . ./.env && set +a && pnpm db:migrate && pnpm db:seed`
Expected: "migrations applied" then "Seeded 7 stacks." (seed `onConflictDoUpdate` leaves owner `"seed"`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/db/schema.ts src/lib/server/db/seed.ts drizzle/
git commit -m "feat(db): add ownerId to stacks + index; seed owner"
```

---

### Task 2: Owner cookie + locals

**Files:**
- Create: `src/hooks.server.ts`
- Modify: `src/app.d.ts`

**Interfaces:**
- Produces: `event.locals.ownerId: string` on every request; `owner_id` cookie set when absent.

- [ ] **Step 1: Type the local**

In `src/app.d.ts`, inside `declare global { namespace App { ... } }`:

```ts
interface Locals {
  ownerId: string;
}
```

- [ ] **Step 2: Write the hook**

Create `src/hooks.server.ts`:

```ts
import type { Handle } from "@sveltejs/kit";

const COOKIE = "owner_id";
const MAX_AGE = 60 * 60 * 24 * 730; // ~2 years

export const handle: Handle = async ({ event, resolve }) => {
  let ownerId = event.cookies.get(COOKIE);
  if (!ownerId) {
    ownerId = crypto.randomUUID();
    event.cookies.set(COOKIE, ownerId, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: MAX_AGE,
    });
  }
  event.locals.ownerId = ownerId;
  return resolve(event);
};
```

- [ ] **Step 3: Verify the cookie is set**

Run: `set -a && . ./.env && set +a && ( ulimit -n 10240; ./node_modules/.bin/vite build ) && ( ulimit -n 4096; ./node_modules/.bin/vite preview --port 5195 & ) ; sleep 6 ; curl -s -i localhost:5195/ | grep -i "set-cookie: owner_id"`
Expected: a `set-cookie: owner_id=...; Max-Age=...; HttpOnly; Secure; SameSite=Lax` line. Then `pkill -f "vite preview"`.

- [ ] **Step 4: Commit**

```bash
git add src/hooks.server.ts src/app.d.ts
git commit -m "feat: anonymous owner_id cookie in hooks.server"
```

---

### Task 3: Server query + ownership helpers (TDD)

**Files:**
- Create: `src/lib/server/ids.ts`
- Create: `tests/server/ids.test.ts`
- Modify: `src/lib/server/stacks.ts`

**Interfaces:**
- Produces:
  - `slugify(name: string): string`
  - `makeId(name: string): string` — `slugify(name) + "-" + <6-char base36>`
  - `handleFor(ownerId: string): string` — deterministic `adjective-noun`
  - `assertOwner(row: { ownerId: string }, ownerId: string): void` — throws `OwnershipError` if mismatch
  - `createStack(ownerId, {name, layout}): Promise<{id: string}>`
  - `updateStack(id, ownerId, patch: {name?: string; layout?: Layout}): Promise<boolean>`
  - `deleteStack(id, ownerId): Promise<boolean>`
  - `setVisibility(id, ownerId, vis): Promise<boolean>`
  - `listMine(ownerId): Promise<GalleryStack[]>`
  - `getOwned(id, ownerId): Promise<GalleryStack | null>`

- [ ] **Step 1: Write failing tests for the pure helpers**

Create `tests/server/ids.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { slugify, makeId, handleFor, assertOwner, OwnershipError } from "@/lib/server/ids";

describe("slugify", () => {
  it("lowercases and dashes", () => expect(slugify("My Stack 2026!")).toBe("my-stack-2026"));
  it("collapses and trims dashes", () => expect(slugify("  a  b  ")).toBe("a-b"));
  it("falls back for empty", () => expect(slugify("")).toBe("stack"));
});

describe("makeId", () => {
  it("adds a suffix so repeats differ", () => {
    const a = makeId("My stack");
    const b = makeId("My stack");
    expect(a).not.toBe(b);
    expect(a.startsWith("my-stack-")).toBe(true);
  });
});

describe("handleFor", () => {
  it("is deterministic", () => expect(handleFor("abc")).toBe(handleFor("abc")));
  it("looks like adjective-noun", () => expect(handleFor("abc")).toMatch(/^[a-z]+-[a-z]+$/));
});

describe("assertOwner", () => {
  it("passes for the owner", () => expect(() => assertOwner({ ownerId: "x" }, "x")).not.toThrow());
  it("throws for a stranger", () => expect(() => assertOwner({ ownerId: "x" }, "y")).toThrow(OwnershipError));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./node_modules/.bin/vitest run tests/server/ids.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `ids.ts`**

Create `src/lib/server/ids.ts`:

```ts
export class OwnershipError extends Error {}

export function slugify(name: string): string {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || "stack";
}

function suffix(len = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

export function makeId(name: string): string {
  return `${slugify(name)}-${suffix()}`;
}

const ADJ = ["swift", "calm", "brave", "lucky", "quiet", "bright", "bold", "keen", "warm", "spry"];
const NOUN = ["otter", "finch", "maple", "comet", "river", "fox", "heron", "pine", "wren", "lynx"];

export function handleFor(ownerId: string): string {
  let h = 0;
  for (let i = 0; i < ownerId.length; i++) h = (h * 31 + ownerId.charCodeAt(i)) >>> 0;
  return `${ADJ[h % ADJ.length]}-${NOUN[(h >> 8) % NOUN.length]}`;
}

export function assertOwner(row: { ownerId: string }, ownerId: string): void {
  if (row.ownerId !== ownerId) throw new OwnershipError("not the owner");
}
```

- [ ] **Step 4: Run to verify pass**

Run: `./node_modules/.bin/vitest run tests/server/ids.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the DB query helpers to `stacks.ts`**

Append to `src/lib/server/stacks.ts` (reuse existing `db`, `stacks`, `rowToStack`, `GalleryStack`; add imports `and`, and `sanitizeLayout` + `MAX_NAME` from codec, and the ids helpers):

```ts
import { and } from "drizzle-orm";
import { sanitizeLayout, MAX_NAME } from "$lib/stickers/codec";
import { makeId, handleFor, assertOwner } from "./ids";
import type { Layout } from "$lib/stickers/types";

export async function listMine(ownerId: string): Promise<GalleryStack[]> {
  if (!db) return [];
  const rows = await db.select().from(stacks).where(eq(stacks.ownerId, ownerId)).orderBy(desc(stacks.updatedAt)).limit(200);
  return rows.map(rowToStack);
}

export async function getOwned(id: string, ownerId: string): Promise<GalleryStack | null> {
  if (!db) return null;
  const [row] = await db.select().from(stacks).where(and(eq(stacks.id, id), eq(stacks.ownerId, ownerId))).limit(1);
  return row ? rowToStack(row) : null;
}

export async function createStack(ownerId: string, input: { name: string; layout: unknown }): Promise<{ id: string }> {
  if (!db) throw new Error("no-db");
  const layout = sanitizeLayout(input.layout) as Layout | null;
  if (!layout) throw new Error("bad-layout");
  const name = (input.name || "My stack").slice(0, MAX_NAME);
  const id = makeId(name);
  await db.insert(stacks).values({
    id, name, author: handleFor(ownerId), ownerId,
    model: layout.laptop.model, color: layout.laptop.color,
    layout, visibility: "private", stickerCount: layout.stickers.length, remixCount: 0,
  });
  return { id };
}

export async function updateStack(id: string, ownerId: string, patch: { name?: string; layout?: unknown }): Promise<boolean> {
  if (!db) throw new Error("no-db");
  const [row] = await db.select().from(stacks).where(eq(stacks.id, id)).limit(1);
  if (!row) return false;
  assertOwner(row, ownerId);
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.name !== undefined) set.name = patch.name.slice(0, MAX_NAME);
  if (patch.layout !== undefined) {
    const layout = sanitizeLayout(patch.layout) as Layout | null;
    if (!layout) throw new Error("bad-layout");
    set.layout = layout; set.model = layout.laptop.model; set.color = layout.laptop.color; set.stickerCount = layout.stickers.length;
  }
  await db.update(stacks).set(set).where(eq(stacks.id, id));
  return true;
}

export async function deleteStack(id: string, ownerId: string): Promise<boolean> {
  if (!db) throw new Error("no-db");
  const [row] = await db.select().from(stacks).where(eq(stacks.id, id)).limit(1);
  if (!row) return false;
  assertOwner(row, ownerId);
  await db.delete(stacks).where(eq(stacks.id, id));
  return true;
}

export async function setVisibility(id: string, ownerId: string, vis: "private" | "unlisted" | "public"): Promise<boolean> {
  if (!db) throw new Error("no-db");
  const [row] = await db.select().from(stacks).where(eq(stacks.id, id)).limit(1);
  if (!row) return false;
  assertOwner(row, ownerId);
  await db.update(stacks).set({ visibility: vis, updatedAt: new Date() }).where(eq(stacks.id, id));
  return true;
}
```

- [ ] **Step 6: Typecheck**

Run: `./node_modules/.bin/svelte-kit sync && ./node_modules/.bin/svelte-check --tsconfig ./tsconfig.json --threshold error 2>&1 | grep -E "stacks.ts|ids.ts" || echo clean`
Expected: `clean`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/ids.ts tests/server/ids.test.ts src/lib/server/stacks.ts
git commit -m "feat(server): stack mutations + ownership helpers (TDD)"
```

---

### Task 4: API endpoints

**Files:**
- Create: `src/routes/api/stacks/+server.ts` (POST create)
- Create: `src/routes/api/stacks/[id]/+server.ts` (PUT, DELETE)
- Create: `src/routes/api/stacks/[id]/visibility/+server.ts` (POST)
- Create: `src/routes/api/stacks/[id]/remix/+server.ts` (POST)

**Interfaces:**
- Consumes: `locals.ownerId`; `createStack/updateStack/deleteStack/setVisibility` (Task 3); `incrementRemix`, `getStack` (existing).
- Produces: JSON HTTP API used by the editor + pages.

- [ ] **Step 1: Create endpoint**

Create `src/routes/api/stacks/+server.ts`:

```ts
import { json, error } from "@sveltejs/kit";
import { createStack } from "$lib/server/stacks";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.ownerId) error(400, "no owner");
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string") error(400, "bad body");
  try {
    return json(await createStack(locals.ownerId, body), { status: 201 });
  } catch (e) {
    error(e instanceof Error && e.message === "bad-layout" ? 400 : 503, "could not create");
  }
};
```

- [ ] **Step 2: Update/Delete endpoint**

Create `src/routes/api/stacks/[id]/+server.ts`:

```ts
import { json, error } from "@sveltejs/kit";
import { updateStack, deleteStack } from "$lib/server/stacks";
import { OwnershipError } from "$lib/server/ids";
import type { RequestHandler } from "./$types";

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.ownerId) error(400, "no owner");
  const body = await request.json().catch(() => null);
  if (!body) error(400, "bad body");
  try {
    const ok = await updateStack(params.id, locals.ownerId, body);
    if (!ok) error(404, "not found");
    return json({ ok: true });
  } catch (e) {
    if (e instanceof OwnershipError) error(403, "forbidden");
    error(e instanceof Error && e.message === "bad-layout" ? 400 : 503, "could not update");
  }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.ownerId) error(400, "no owner");
  try {
    const ok = await deleteStack(params.id, locals.ownerId);
    if (!ok) error(404, "not found");
    return json({ ok: true });
  } catch (e) {
    if (e instanceof OwnershipError) error(403, "forbidden");
    error(503, "could not delete");
  }
};
```

- [ ] **Step 3: Visibility endpoint**

Create `src/routes/api/stacks/[id]/visibility/+server.ts`:

```ts
import { json, error } from "@sveltejs/kit";
import { setVisibility } from "$lib/server/stacks";
import { OwnershipError } from "$lib/server/ids";
import type { RequestHandler } from "./$types";

const VALID = ["private", "unlisted", "public"] as const;

export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.ownerId) error(400, "no owner");
  const body = await request.json().catch(() => null);
  if (!body || !VALID.includes(body.visibility)) error(400, "bad visibility");
  try {
    const ok = await setVisibility(params.id, locals.ownerId, body.visibility);
    if (!ok) error(404, "not found");
    return json({ ok: true });
  } catch (e) {
    if (e instanceof OwnershipError) error(403, "forbidden");
    error(503, "could not update");
  }
};
```

- [ ] **Step 4: Remix endpoint (accessible stacks only)**

Create `src/routes/api/stacks/[id]/remix/+server.ts`:

```ts
import { json, error } from "@sveltejs/kit";
import { getStack, incrementRemix } from "$lib/server/stacks";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ params }) => {
  const stack = await getStack(params.id); // getStack returns public/unlisted/private alike; guard below
  if (!stack || stack.vis === "Private") error(404, "not found");
  await incrementRemix(params.id);
  return json({ ok: true });
};
```

Note: `getStack` currently returns any row by id. That is fine for the shared page (unlisted links) but remix must refuse `Private`. The `stack.vis === "Private"` guard enforces the Review-Focus rule.

- [ ] **Step 5: Verify endpoints against dev DB**

Run (saves a cookie jar so owner is stable):

```bash
set -a && . ./.env && set +a
( ulimit -n 10240; ./node_modules/.bin/vite build ) && ( ulimit -n 4096; ./node_modules/.bin/vite preview --port 5196 & ) ; sleep 6
J=/tmp/ss-cj.txt
# create
curl -s -c $J -b $J -X POST localhost:5196/api/stacks -H 'content-type: application/json' \
  -d '{"name":"Test stack","layout":{"v":1,"laptop":{"model":"air13","color":"silver"},"stickers":[]}}'
# non-owner delete (fresh cookie jar -> different owner) should 403/404
curl -s -o /dev/null -w "stranger delete: %{http_code}\n" -X DELETE localhost:5196/api/stacks/<id-from-create>
pkill -f "vite preview"
```

Expected: create returns `{"id":"test-stack-xxxxxx"}`; a delete with a *different* owner returns 403 or 404 (never 200).

- [ ] **Step 6: Commit**

```bash
git add src/routes/api/stacks
git commit -m "feat(api): ownership-enforced stack endpoints (create/update/delete/visibility/remix)"
```

---

### Task 5: My stacks — real list + ⋯ menu

**Files:**
- Create: `src/routes/stacks/+page.server.ts`
- Modify: `src/routes/stacks/+page.svelte`

**Interfaces:**
- Consumes: `listMine` (Task 3); endpoints (Task 4); shadcn `dropdown-menu`.

- [ ] **Step 1: Server load**

Create `src/routes/stacks/+page.server.ts`:

```ts
import { listMine } from "$lib/server/stacks";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  return { stacks: await listMine(locals.ownerId) };
};
```

- [ ] **Step 2: Wire the page to `data` + add the menu**

In `src/routes/stacks/+page.svelte`: replace the `import { myStacks } from "@/lib/stacks/mock"` usage with `let { data } = $props()` and `const stacks = $derived(data.stacks)`; iterate `stacks`. Add `import { invalidateAll, goto } from "$app/navigation"` and `import * as DropdownMenu from "@/components/ui/dropdown-menu"`. Replace the inert `⋯` button with:

```svelte
<DropdownMenu.Root>
  <DropdownMenu.Trigger class="...existing more-button classes...">
    <MoreHorizontal class="size-[15px]" />
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" class="w-44">
    <DropdownMenu.Item onSelect={() => goto(`/editor?id=${stack.id}`)}>Open</DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => rename(stack)}>Rename</DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => duplicate(stack)}>Duplicate</DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => copyLink(stack)}>Copy link</DropdownMenu.Item>
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger>Visibility</DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent>
        {#each ["private","unlisted","public"] as v (v)}
          <DropdownMenu.Item onSelect={() => setVis(stack, v)}>{v}</DropdownMenu.Item>
        {/each}
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>
    <DropdownMenu.Separator />
    <DropdownMenu.Item class="text-red-500" onSelect={() => del(stack)}>Delete</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
```

Add the handlers in `<script>`:

```ts
import { toast } from "svelte-sonner";
async function del(s) {
  if (!confirm(`Delete "${s.name}"?`)) return;
  const r = await fetch(`/api/stacks/${s.id}`, { method: "DELETE" });
  if (r.ok) { toast("Deleted"); invalidateAll(); } else toast.error("Couldn't delete");
}
async function setVis(s, visibility) {
  const r = await fetch(`/api/stacks/${s.id}/visibility`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ visibility }) });
  if (r.ok) { toast(`Now ${visibility}`); invalidateAll(); } else toast.error("Couldn't update");
}
async function rename(s) {
  const name = prompt("Rename stack", s.name);
  if (name == null) return;
  const r = await fetch(`/api/stacks/${s.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
  if (r.ok) { invalidateAll(); } else toast.error("Couldn't rename");
}
async function duplicate(s) {
  const r = await fetch(`/api/stacks`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: s.name + " copy", layout: s.layout }) });
  if (r.ok) { toast("Duplicated"); invalidateAll(); } else toast.error("Couldn't duplicate");
}
async function copyLink(s) {
  await navigator.clipboard.writeText(location.origin + "/stack/" + s.id);
  toast("Link copied");
}
```

Empty state: when `stacks.length === 0`, render a short "No stacks yet — open the editor" card linking to `/editor` (keep the existing "New stack" tile; only the mapped cards are data-driven).

- [ ] **Step 3: Typecheck + manual verify**

Run: `./node_modules/.bin/svelte-kit sync && ./node_modules/.bin/svelte-check --tsconfig ./tsconfig.json --threshold error 2>&1 | grep "routes/stacks" || echo clean`
Expected: `clean`. Then build+preview, create a stack via the editor (Task 6) and confirm it appears here; test delete/rename/visibility.

- [ ] **Step 4: Commit**

```bash
git add src/routes/stacks
git commit -m "feat(my-stacks): real owner list + card actions menu"
```

---

### Task 6: Editor — Save + open-by-id

**Files:**
- Modify: `src/lib/stickers/editor.svelte.ts`
- Modify: `src/components/editor/EditorShell.svelte`
- Modify: `src/components/editor/EditorHeader.svelte`
- Create: `src/components/editor/save.ts`

**Interfaces:**
- Produces: `editor.savedId: string | null`, `editor.saving: boolean`; `saveStack(editor)` helper.
- Consumes: `/api/stacks` (POST/PUT); `getOwned` via a loader route (below).

- [ ] **Step 1: Add savedId/saving state to EditorState**

In `editor.svelte.ts`, add fields near the other `$state` UI flags:

```ts
/** server id once this stack has been saved to My stacks; null = unsaved draft */
savedId = $state<string | null>(null);
/** a save request is in flight */
saving = $state(false);
```

- [ ] **Step 2: Save helper**

Create `src/components/editor/save.ts`:

```ts
import { toast } from "svelte-sonner";
import type { EditorState } from "$lib/stickers/editor.svelte";

export async function saveStack(editor: EditorState): Promise<void> {
  if (editor.saving) return;
  editor.saving = true;
  const layout = $state.snapshot(editor.layout);
  const name = editor.layout.name ?? "My stack";
  try {
    if (editor.savedId) {
      const r = await fetch(`/api/stacks/${editor.savedId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, layout }) });
      if (!r.ok) throw new Error();
      toast("Saved");
    } else {
      const r = await fetch(`/api/stacks`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, layout }) });
      if (!r.ok) throw new Error();
      const { id } = await r.json();
      editor.savedId = id;
      toast("Saved to My stacks");
    }
  } catch {
    toast.error("Couldn't save");
  } finally {
    editor.saving = false;
  }
}
```

- [ ] **Step 3: Save button in the header**

In `EditorHeader.svelte`, import `saveStack` from `./save` and add before the Share button:

```svelte
<Button variant="outline" size="sm" class="h-7.5 gap-1.75 px-3 text-[13px]" title="Save to My stacks" disabled={editor.saving} onclick={() => saveStack(editor)}>
  <SaveIcon class="size-3.5" />{editor.savedId ? "Save" : "Save"}
</Button>
```

(Import `SaveIcon from "@lucide/svelte/icons/save"`.)

- [ ] **Step 4: Open-by-id loader route**

Create `src/routes/editor/saved/[id]/+server.ts` (owner-scoped fetch the editor can call):

```ts
import { json, error } from "@sveltejs/kit";
import { getOwned } from "$lib/server/stacks";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, locals }) => {
  const stack = await getOwned(params.id, locals.ownerId);
  if (!stack) error(404, "not found");
  return json({ id: stack.id, layout: stack.layout });
};
```

- [ ] **Step 5: Load `?id=` in EditorShell**

In `EditorShell.svelte` `onMount`, after the `add` handling, add:

```ts
const id = url.searchParams.get("id");
if (id) {
  fetch(`/editor/saved/${id}`).then((r) => r.ok ? r.json() : null).then((data) => {
    if (data?.layout) { editor.replace(data.layout); editor.savedId = data.id; }
  });
  url.searchParams.delete("id");
  history.replaceState(history.state, "", url);
}
```

(Confirm `editor.replace(layout: Layout)` exists — it does, per `#commit(layout)` in `replace`. If named differently, use the method that swaps the whole layout.)

- [ ] **Step 6: Typecheck + manual verify**

Run: `./node_modules/.bin/svelte-kit sync && ./node_modules/.bin/svelte-check --tsconfig ./tsconfig.json --threshold error 2>&1 | grep -E "editor|save.ts" || echo clean`
Expected: `clean`. Build+preview: open `/editor`, add a logo, click Save → toast; refresh `/stacks` → the stack shows; open it via `/editor?id=<slug>` → it loads.

- [ ] **Step 7: Commit**

```bash
git add src/lib/stickers/editor.svelte.ts src/components/editor/save.ts src/components/editor/EditorHeader.svelte src/components/editor/EditorShell.svelte src/routes/editor/saved
git commit -m "feat(editor): Save to My stacks + open saved stack by id"
```

---

### Task 7: Editor — Share visibility + persistent link

**Files:**
- Modify: `src/components/editor/ExportDialog.svelte`

**Interfaces:**
- Consumes: `editor.savedId`, `saveStack` (Task 6); `/api/stacks/[id]/visibility` (Task 4).

- [ ] **Step 1: Replace the hash link in the Share tab with the persistent link + visibility**

In `ExportDialog.svelte`, the share branch (`{#if share}`) currently shows `shareUrl(editor)` (the `#l=` hash) and "Share to" socials. Change it so:
- The copyable URL is `location.origin + "/stack/" + editor.savedId` when saved; when `editor.savedId` is null, show a "Save this stack to get a shareable link" state with a **Save & share** button that calls `saveStack(editor)` then continues.
- Add a visibility segmented control (Private / Unlisted / Public) that, on change, `fetch`es `POST /api/stacks/${editor.savedId}/visibility`. Default shown = current; after first save set to `unlisted` automatically so the link works:

```svelte
<script> // additions
  import { saveStack } from "./save";
  let vis = $state<"private" | "unlisted" | "public">("unlisted");
  async function shareReady() {
    if (!editor.savedId) await saveStack(editor);
    if (editor.savedId) await setVis(vis === "private" ? "unlisted" : vis);
  }
  async function setVis(v) {
    if (!editor.savedId) return;
    vis = v;
    await fetch(`/api/stacks/${editor.savedId}/visibility`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ visibility: v }) });
  }
  const persistentUrl = $derived(editor.savedId ? location.origin + "/stack/" + editor.savedId : "");
</script>
```

Replace `const url = $derived(editor.exportDialog ? shareUrl(editor) : "")` so that in share mode `url = persistentUrl` (keep the `#l=` hash only for the download/copy-elsewhere cases if still needed; otherwise drop the `shareUrl` import). The copy button copies `persistentUrl`. Call `shareReady()` when the share tab opens (e.g. `$effect` on `share`).

Update the helper caption from "The whole layout lives in the link…" to "Anyone with the link can view and remix this stack."

- [ ] **Step 2: Typecheck + manual verify**

Run: `./node_modules/.bin/svelte-kit sync && ./node_modules/.bin/svelte-check --tsconfig ./tsconfig.json --threshold error 2>&1 | grep "ExportDialog" || echo clean`
Expected: `clean`. Build+preview: open a stack, click Share → it saves (if needed), sets unlisted, shows `/stack/<slug>`; open that URL in a fresh browser → the shared page renders; set Public → it appears in `/gallery`.

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/ExportDialog.svelte
git commit -m "feat(editor): share sets visibility + persistent /stack link"
```

---

### Task 8: Remix flow

**Files:**
- Modify: `src/routes/stack/[id]/+page.svelte`
- Modify: `src/routes/gallery/+page.svelte`

**Interfaces:**
- Consumes: `remixHref` (existing, `/editor#l=…`); `/api/stacks/[id]/remix` (Task 4).

- [ ] **Step 1: Fire the remix beacon on the shared page**

In `src/routes/stack/[id]/+page.svelte`, change the Remix `<Button href={remixHref(stack)}>` to also bump the counter without blocking navigation:

```svelte
<Button href={remixHref(stack)} onclick={() => navigator.sendBeacon?.(`/api/stacks/${stack.id}/remix`)} class="h-10 flex-1">
  <GitBranchIcon class="size-[15px]" /> Remix this stack
</Button>
```

- [ ] **Step 2: Same on the gallery hover Remix**

In `src/routes/gallery/+page.svelte`, add the same `onclick={() => navigator.sendBeacon?.(`/api/stacks/${stack.id}/remix`)}` to the hover "Remix" button.

- [ ] **Step 3: Manual verify**

Build+preview: from `/stack/<public-slug>` click Remix → editor opens with a copy (no `savedId`); reload the shared page → `remixCount` is +1. (A `private` id's remix beacon is ignored by the endpoint — Review Focus.)

- [ ] **Step 4: Commit**

```bash
git add src/routes/stack/[id]/+page.svelte src/routes/gallery/+page.svelte
git commit -m "feat(remix): bump source remixCount when opening a copy"
```

---

## Done when

All eight tasks committed; `svelte-check` clean; a full manual loop works against the dev Neon DB: build a stack → Save → see it in My stacks → Share (Unlisted) → open the link in another browser → Remix → the copy opens and the source's remix count ticks up; a stranger cannot delete or edit someone else's stack.
