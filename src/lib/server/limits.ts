import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "./db";
import { brandRequests, stacks } from "./db/schema";

export type LimitResult = { ok: true } | { ok: false; retryAfterSec: number };

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * If `max` rows already sit inside the window, the window frees a slot when the max-th newest
 * one ages out. `rows` are the newest `max` creation times, newest first.
 */
function check(rows: { createdAt: Date }[], max: number, windowMs: number): LimitResult {
  if (rows.length < max) return { ok: true };
  const frees = rows[max - 1].createdAt.getTime() + windowMs - Date.now();
  return { ok: false, retryAfterSec: Math.max(1, Math.ceil(frees / 1000)) };
}

/** 3 requests per email per 24 h, 10 per IP per hour. No database (dev) means no limit. */
export async function brandRequestLimit(ip: string, email: string): Promise<LimitResult> {
  if (!db) return { ok: true };
  const recent = (col: ReturnType<typeof eq>, since: number, max: number) =>
    db!
      .select({ createdAt: brandRequests.createdAt })
      .from(brandRequests)
      .where(and(col, gt(brandRequests.createdAt, new Date(Date.now() - since))))
      .orderBy(desc(brandRequests.createdAt))
      .limit(max);
  const [byEmail, byIp] = await Promise.all([
    recent(eq(sql`lower(${brandRequests.email})`, email.toLowerCase()), DAY, 3),
    recent(eq(brandRequests.ip, ip), HOUR, 10),
  ]);
  const a = check(byEmail, 3, DAY);
  const b = check(byIp, 10, HOUR);
  if (!a.ok && !b.ok) return { ok: false, retryAfterSec: Math.max(a.retryAfterSec, b.retryAfterSec) };
  return !a.ok ? a : b;
}

/** 60 designs created per owner cookie per hour. */
export async function createDesignLimit(ownerId: string): Promise<LimitResult> {
  if (!db) return { ok: true };
  const rows = await db
    .select({ createdAt: stacks.createdAt })
    .from(stacks)
    .where(and(eq(stacks.ownerId, ownerId), gt(stacks.createdAt, new Date(Date.now() - HOUR))))
    .orderBy(desc(stacks.createdAt))
    .limit(60);
  return check(rows, 60, HOUR);
}

/** "Too many requests. Try again in N minutes." */
export function tooMany(retryAfterSec: number): Response {
  const min = Math.max(1, Math.ceil(retryAfterSec / 60));
  return new Response(JSON.stringify({ error: `Too many requests. Try again in ${min} minute${min === 1 ? "" : "s"}.` }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": String(retryAfterSec) },
  });
}
