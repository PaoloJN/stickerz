import { json, error } from "@sveltejs/kit";
import { getOwnerName, setOwnerName } from "$lib/server/owners";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.ownerId) error(400, "no owner");
  return json({ displayName: await getOwnerName(locals.ownerId) });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.ownerId) error(400, "no owner");
  const body = await request.json().catch(() => null);
  if (!body || typeof body.displayName !== "string") error(400, "bad body");
  try {
    return json({ displayName: await setOwnerName(locals.ownerId, body.displayName) });
  } catch {
    error(503, "could not save name");
  }
};
