import { error } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { makeRequestId, type BrandRequest } from "$lib/brands";
import { db } from "./db";
import { brandRequests } from "./db/schema";
import { waitUntil } from "@vercel/functions";
import { openBrandRequestIssue } from "./github-issues";

/**
 * Store a validated brand request and return its reference. Without DATABASE_URL nothing can be stored:
 * in dev (before provisioning) we log and still hand back an id so the page flow works; in production
 * we refuse with a 503 rather than hand out a reference for a request nobody will ever see.
 * Once stored (or mocked in dev) a GitHub issue is opened in the background; it is never awaited and never fails the request.
 */
export async function createBrandRequest(input: BrandRequest, ip?: string): Promise<{ id: string }> {
  const id = makeRequestId();
  if (!db) {
    if (!dev) error(503, "Requests are temporarily unavailable. Please try again later.");
    console.warn(`[brand-requests] DATABASE_URL not set; request ${id} (${input.mode}, ${input.company}) was not stored`);
    notify(id, input);
    return { id };
  }
  await db.insert(brandRequests).values({
    id,
    mode: input.mode,
    company: input.company,
    name: input.name,
    email: input.email,
    logos: input.logos,
    plan: input.plan,
    details: input.details,
    authorized: input.authorized,
    ip: ip ?? null,
  });
  notify(id, input);
  return { id };
}

/** fire and forget; no email goes to GitHub. `waitUntil` keeps the serverless function alive until the POST finishes. */
function notify(id: string, r: BrandRequest) {
  waitUntil(openBrandRequestIssue({ id, mode: r.mode, company: r.company, name: r.name, logos: r.logos, plan: r.plan, details: r.details }));
}
