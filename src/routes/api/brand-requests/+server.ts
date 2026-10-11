import { json, isHttpError } from "@sveltejs/kit";
import { brandRequestSchema, fieldErrors } from "$lib/brands";
import { createBrandRequest } from "$lib/server/brand-requests";
import { brandRequestLimit, tooMany } from "$lib/server/limits";
import { clientIp } from "$lib/server/ip";
import type { RequestHandler } from "./$types";

const MAX_BODY = 32 * 1024;

/** POST a brand request (remove / update / feature). 201 { id } · 400 { errors } · 413 · 429 · 503 { error }. */
export const POST: RequestHandler = async (event) => {
  const { request } = event;
  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_BODY) return json({ error: "Request is too large." }, { status: 413 });
  const text = await request.text();
  if (text.length > MAX_BODY) return json({ error: "Request is too large." }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ errors: { form: "Send the request as JSON." } }, { status: 400 });
  }

  const parsed = brandRequestSchema.safeParse(body);
  if (!parsed.success) return json({ errors: fieldErrors(parsed.error) }, { status: 400 });

  const ip = clientIp(event);
  try {
    const limit = await brandRequestLimit(ip, parsed.data.email);
    if (!limit.ok) return tooMany(limit.retryAfterSec);
    return json(await createBrandRequest(parsed.data, ip), { status: 201 });
  } catch (e) {
    // e.g. the 503 when storage isn't configured; the form shows `error`
    if (isHttpError(e)) return json({ error: e.body.message }, { status: e.status });
    console.error("[brand-requests] insert failed", e);
    return json({ error: "Could not save the request. Please try again." }, { status: 503 });
  }
};
