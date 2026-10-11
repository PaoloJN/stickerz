import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { env } from "$env/dynamic/private";
import * as schema from "./schema";

/**
 * Drizzle client over Neon's HTTP driver. `DATABASE_URL` is injected by the Neon integration
 * on Vercel (Storage → Marketplace → Neon). When it's absent (e.g. local dev before provisioning),
 * `db` is null and the query layer falls back to mock data so the app still runs.
 */
const url = env.DATABASE_URL;

export const dbConfigured = Boolean(url);

export const db = url ? drizzle(neon(url), { schema }) : null;
