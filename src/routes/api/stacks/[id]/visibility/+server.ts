import { json, error, isHttpError } from "@sveltejs/kit";
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
    if (isHttpError(e)) throw e;
    if (e instanceof OwnershipError) error(403, "forbidden");
    error(503, "could not update");
  }
};
