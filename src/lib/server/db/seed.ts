/**
 * Seed the gallery from the current mock stacks. Run once Neon is provisioned:
 *   DATABASE_URL=postgres://... pnpm db:seed
 * (uses vite-node so the $lib imports in mock.ts resolve)
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import { stacks, type NewStackRow } from "./schema";
import { STACKS } from "../../stacks/mock";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set — set it before seeding.");

const db = drizzle(neon(url), { schema: { stacks } });

function parseRemix(s: string): number {
  const m = s.trim().match(/^([\d.]+)\s*k$/i);
  return m ? Math.round(parseFloat(m[1]) * 1000) : parseInt(s, 10) || 0;
}

const rows: NewStackRow[] = STACKS.map((s, i) => {
  const ts = new Date(Date.now() - i * 36 * 3_600_000); // stagger so "newest" ordering is sensible
  return {
    id: s.id,
    name: s.name,
    author: s.by,
    ownerId: "seed",
    model: s.layout.laptop.model,
    color: s.layout.laptop.color,
    layout: s.layout,
    // seed everything public so the gallery has content; tweak later
    visibility: "public",
    stickerCount: s.count,
    remixCount: parseRemix(s.remix),
    createdAt: ts,
    updatedAt: ts,
  };
});

await db
  .insert(stacks)
  .values(rows)
  .onConflictDoUpdate({
    target: stacks.id,
    set: {
      name: stacks.name,
      layout: stacks.layout,
      remixCount: stacks.remixCount,
      updatedAt: stacks.updatedAt,
      ownerId: sql`excluded.owner_id`,
    },
  });

console.log(`Seeded ${rows.length} stacks.`);
