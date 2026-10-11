import { json, error } from "@sveltejs/kit";
import { createStack, listMine } from "$lib/server/stacks";
import { createDesignLimit, tooMany } from "$lib/server/limits";
import type { RequestHandler } from "./$types";

/** The caller's designs, newest first: just what the editor's design switcher shows. */
export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.ownerId) return json({ designs: [] });
  try {
    const mine = await listMine(locals.ownerId);
    return json({
      designs: mine.map((s) => ({ id: s.id, name: s.name, count: s.count, edited: s.edited, model: s.layout.laptop.model, color: s.layout.laptop.color })),
    });
  } catch {
    error(503, "could not list");
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.ownerId) error(400, "no owner");
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string") error(400, "bad body");
  try {
    const limit = await createDesignLimit(locals.ownerId);
    if (!limit.ok) return tooMany(limit.retryAfterSec);
    return json(await createStack(locals.ownerId, body), { status: 201 });
  } catch (e) {
    error(e instanceof Error && e.message === "bad-layout" ? 400 : 503, "could not create");
  }
};
