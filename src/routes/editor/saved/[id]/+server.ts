import { json, error } from "@sveltejs/kit";
import { getOwned } from "$lib/server/stacks";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, locals }) => {
  const stack = await getOwned(params.id, locals.ownerId);
  if (!stack) error(404, "not found");
  return json({ id: stack.id, layout: stack.layout, visibility: stack.vis.toLowerCase() });
};
