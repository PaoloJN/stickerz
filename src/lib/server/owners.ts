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
