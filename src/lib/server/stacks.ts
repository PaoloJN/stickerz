import { and, desc, eq, sql } from "drizzle-orm";
import { sanitizeLayout, MAX_NAME } from "$lib/stickers/codec";
import { makeId, assertOwner } from "./ids";
import { getOwnerName } from "./owners";
import type { Layout } from "$lib/stickers/types";
import { db } from "./db";
import { stacks, type StackRow } from "./db/schema";
import { STACKS, type MockStack, type Visibility } from "$lib/stacks/mock";

/**
 * Shape the stack pages consume (same fields as a mock stack), whether it came from the
 * database or the mock fallback.
 */
export type GalleryStack = {
  id: string;
  name: string;
  by: string;
  edited: string;
  vis: Visibility;
  remix: string;
  count: number;
  layout: MockStack["layout"];
};

export type GallerySort = "trending" | "newest" | "most-remixed";

const VIS: Record<string, Visibility> = { public: "Public", unlisted: "Unlisted", private: "Private" };

/** 1234 -> "1.2k" */
function formatRemix(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0).replace(/\.0$/, "") + "k";
  return String(n);
}

/** a short, human "edited" label from a timestamp */
function relTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const h = diff / 3_600_000;
  if (h < 1) return "Just now";
  if (h < 24) return `${Math.round(h)} hour${Math.round(h) === 1 ? "" : "s"} ago`;
  if (h < 48) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function rowToStack(r: StackRow): GalleryStack {
  return {
    id: r.id,
    name: r.name,
    by: r.author,
    edited: relTime(r.updatedAt),
    vis: VIS[r.visibility] ?? "Public",
    remix: formatRemix(r.remixCount),
    count: r.stickerCount || r.layout.stickers.length,
    layout: r.layout,
  };
}

/** MockStack already matches GalleryStack. */
const fromMock = (m: MockStack): GalleryStack => m;

type Rankable = { createdAt: Date; remixCount: number };

/** Trending score: remixes, decayed by age in days (same formula as the SQL in `listGallery`). */
export function trendingScore(r: Rankable, now = Date.now()): number {
  const ageDays = Math.max(0, now - r.createdAt.getTime()) / 86_400_000;
  return (r.remixCount + 1) / Math.pow(ageDays + 2, 1.5);
}

/** Sort rows the way `listGallery` orders them in SQL. Returns a new array. */
export function sortGallery<T extends Rankable>(rows: readonly T[], sort: GallerySort, now = Date.now()): T[] {
  const newest = (a: T, b: T) => b.createdAt.getTime() - a.createdAt.getTime();
  const cmp =
    sort === "newest"
      ? newest
      : sort === "most-remixed"
        ? (a: T, b: T) => b.remixCount - a.remixCount || newest(a, b)
        : (a: T, b: T) => trendingScore(b, now) - trendingScore(a, now) || newest(a, b);
  return [...rows].sort(cmp);
}

/** "1.2k" -> 1200 (mock remix labels back to numbers) */
function parseRemix(label: string): number {
  const m = /^([\d.]+)(k?)$/i.exec(label.trim());
  if (!m) return 0;
  return Math.round(parseFloat(m[1]) * (m[2] ? 1000 : 1));
}

/** Public stacks for the gallery, ordered by the chosen sort. */
export async function listGallery(sort: GallerySort = "trending", limit = 60): Promise<GalleryStack[]> {
  if (!db) {
    // mock seeds are listed newest-first; give them synthetic dates so the sorts behave like the SQL
    const now = Date.now();
    const ranked = STACKS.filter((m) => m.vis === "Public").map((m, i) => ({ m, createdAt: new Date(now - i * 86_400_000), remixCount: parseRemix(m.remix) }));
    return sortGallery(ranked, sort, now).map((r) => fromMock(r.m));
  }
  const newest = desc(stacks.createdAt);
  const order =
    sort === "newest"
      ? [newest]
      : sort === "most-remixed"
        ? [desc(stacks.remixCount), newest]
        : [
            desc(sql`(${stacks.remixCount} + 1) / power(extract(epoch from now() - ${stacks.createdAt}) / 86400 + 2, 1.5)`),
            newest,
          ];
  const rows = await db
    .select()
    .from(stacks)
    .where(eq(stacks.visibility, "public"))
    .orderBy(...order)
    .limit(limit);
  return rows.map(rowToStack);
}

/** Every public design's id and last edit, for the sitemap. `[]` without a database. */
export async function listPublicIds(limit = 5000): Promise<{ id: string; updatedAt: Date }[]> {
  if (!db) return [];
  return db
    .select({ id: stacks.id, updatedAt: stacks.updatedAt })
    .from(stacks)
    .where(eq(stacks.visibility, "public"))
    .orderBy(desc(stacks.updatedAt))
    .limit(limit);
}

/** usage counts are one grouped query; keep them for a minute so every sticker page doesn't rerun it */
const USAGE_TTL = 60_000;
let usageCache: { at: number; counts: Record<string, number> } | null = null;

/**
 * How many public designs use each logo key (a design counts once however many copies it holds). Real data only:
 * `{}` without a database, so pages show no numbers rather than mock ones.
 */
export async function logoUsage(): Promise<Record<string, number>> {
  if (!db) return {};
  if (usageCache && Date.now() - usageCache.at < USAGE_TTL) return usageCache.counts;
  const res = await db.execute<{ logo: string; n: number }>(sql`
    select s->>'logo' as logo, count(distinct ${stacks.id})::int as n
    from ${stacks}, jsonb_array_elements(${stacks.layout}->'stickers') as s
    where ${stacks.visibility} = 'public'
    group by 1`);
  const counts: Record<string, number> = {};
  for (const r of res.rows) if (typeof r.logo === "string") counts[r.logo] = Number(r.n) || 0;
  usageCache = { at: Date.now(), counts };
  return counts;
}

/** Public designs that use `key`, most remixed first. `[]` without a database (callers pick their own fallback). */
export async function designsWithLogo(key: string, limit = 60): Promise<GalleryStack[]> {
  if (!db) return [];
  const rows = await db
    .select()
    .from(stacks)
    .where(and(eq(stacks.visibility, "public"), sql`${stacks.layout}->'stickers' @> ${JSON.stringify([{ logo: key }])}::jsonb`))
    .orderBy(desc(stacks.remixCount))
    .limit(limit);
  return rows.map(rowToStack);
}

/**
 * Whether `viewerId` may open a design: public and unlisted are open to anyone with the link,
 * private only to its owner.
 */
export function canView(row: Pick<StackRow, "visibility" | "ownerId">, viewerId?: string | null): boolean {
  if (row.visibility !== "private") return true;
  return Boolean(viewerId) && Boolean(row.ownerId) && row.ownerId === viewerId;
}

/**
 * One stack by slug, or null when it doesn't exist *or* the viewer may not see it (a private
 * design opened by anyone but its owner), so callers 404 without confirming it exists.
 */
export async function getStack(id: string, viewerId?: string | null): Promise<GalleryStack | null> {
  if (!db) {
    // mock stacks have no owner, so a private one is never viewable
    const m = STACKS.find((s) => s.id === id);
    return m && m.vis !== "Private" ? m : null;
  }
  const [row] = await db.select().from(stacks).where(eq(stacks.id, id)).limit(1);
  return row && canView(row, viewerId) ? rowToStack(row) : null;
}

/** Bump a stack's remix counter (call when someone remixes it). No-op without a DB. */
export async function incrementRemix(id: string): Promise<void> {
  if (!db) return;
  const [row] = await db.select({ n: stacks.remixCount }).from(stacks).where(eq(stacks.id, id)).limit(1);
  if (row) await db.update(stacks).set({ remixCount: row.n + 1 }).where(eq(stacks.id, id));
}


/** All stacks owned by this anonymous owner, newest first. */
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
  const name = (input.name || "My design").slice(0, MAX_NAME);
  const id = makeId(name);
  await db.insert(stacks).values({
    id, name, author: (await getOwnerName(ownerId)) ?? "anonymous", ownerId,
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
  if (patch.name !== undefined) set.name = (patch.name.trim() || "My design").slice(0, MAX_NAME);
  if (patch.layout !== undefined) {
    const layout = sanitizeLayout(patch.layout) as Layout | null;
    if (!layout) throw new Error("bad-layout");
    set.layout = layout; set.model = layout.laptop.model; set.color = layout.laptop.color; set.stickerCount = layout.stickers.length;
  }
  await db.update(stacks).set(set).where(and(eq(stacks.id, id), eq(stacks.ownerId, ownerId)));
  return true;
}

export async function deleteStack(id: string, ownerId: string): Promise<boolean> {
  if (!db) throw new Error("no-db");
  const [row] = await db.select().from(stacks).where(eq(stacks.id, id)).limit(1);
  if (!row) return false;
  assertOwner(row, ownerId);
  await db.delete(stacks).where(and(eq(stacks.id, id), eq(stacks.ownerId, ownerId)));
  return true;
}

export async function setVisibility(id: string, ownerId: string, vis: "private" | "unlisted" | "public"): Promise<boolean> {
  if (!db) throw new Error("no-db");
  const [row] = await db.select().from(stacks).where(eq(stacks.id, id)).limit(1);
  if (!row) return false;
  assertOwner(row, ownerId);
  await db.update(stacks).set({ visibility: vis, updatedAt: new Date() }).where(and(eq(stacks.id, id), eq(stacks.ownerId, ownerId)));
  return true;
}
