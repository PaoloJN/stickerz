import { pgTable, text, integer, jsonb, timestamp, index, boolean } from "drizzle-orm/pg-core";
// relative import (type-only) so drizzle-kit can load this file without SvelteKit's $lib alias
import type { Layout } from "../../stickers/types";

/**
 * A saved/shared stack. The whole sticker layout lives in `layout` (jsonb) — same shape the
 * editor and <StackLid> use. `visibility` gates the public gallery; `remixCount` powers
 * "Most remixed" / "Trending".
 */
export const stacks = pgTable(
  "stacks",
  {
    id: text("id").primaryKey(), // url slug, e.g. "frontend-2026"
    name: text("name").notNull(),
    author: text("author").notNull(),
    ownerId: text("owner_id").notNull().default(""),
    model: text("model").notNull(), // device id, e.g. "air13"
    color: text("color").notNull(), // finish id, e.g. "silver"
    layout: jsonb("layout").$type<Layout>().notNull(),
    visibility: text("visibility", { enum: ["public", "unlisted", "private"] })
      .notNull()
      .default("public"),
    stickerCount: integer("sticker_count").notNull().default(0),
    remixCount: integer("remix_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("stacks_gallery_idx").on(t.visibility, t.createdAt),
    index("stacks_owner_idx").on(t.ownerId, t.updatedAt),
  ],
);

export type StackRow = typeof stacks.$inferSelect;
export type NewStackRow = typeof stacks.$inferInsert;

/** Optional per-owner display name, shown instead of the generated author handle. */
export const owners = pgTable("owners", {
  ownerId: text("owner_id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type OwnerRow = typeof owners.$inferSelect;

/** A request from the For Brands page: remove a logo, update it, or feature it. */
export const brandRequests = pgTable("brand_requests", {
  id: text("id").primaryKey(), // "BR-" + 6 chars
  mode: text("mode", { enum: ["remove", "update", "feature"] }).notNull(),
  company: text("company").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  logos: jsonb("logos").$type<string[]>().notNull().default([]),
  plan: text("plan"),
  details: text("details"),
  authorized: boolean("authorized").notNull().default(false),
  ip: text("ip"), // caller address, for rate limiting
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
