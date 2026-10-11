import { json, error, isHttpError } from "@sveltejs/kit";
import { updateStack, deleteStack } from "$lib/server/stacks";
import { OwnershipError } from "$lib/server/ids";
import type { RequestHandler } from "./$types";

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.ownerId) error(400, "no owner");
  const body = await request.json().catch(() => null);
  if (!body) error(400, "bad body");
  if (body.name !== undefined && typeof body.name !== "string") error(400, "bad name");
  try {
    const ok = await updateStack(params.id, locals.ownerId, body);
    if (!ok) error(404, "not found");
    return json({ ok: true });
  } catch (e) {
    if (isHttpError(e)) throw e;
    if (e instanceof OwnershipError) error(403, "forbidden");
    error(e instanceof Error && e.message === "bad-layout" ? 400 : 503, "could not update");
  }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.ownerId) error(400, "no owner");
  try {
    const ok = await deleteStack(params.id, locals.ownerId);
    if (!ok) error(404, "not found");
    return json({ ok: true });
  } catch (e) {
    if (isHttpError(e)) throw e;
    if (e instanceof OwnershipError) error(403, "forbidden");
    error(503, "could not delete");
  }
};
