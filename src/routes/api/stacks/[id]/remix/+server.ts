import { json, error } from "@sveltejs/kit";
import { getStack, incrementRemix } from "$lib/server/stacks";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ params, locals }) => {
  const stack = await getStack(params.id, locals.ownerId);
  // private designs never count remixes (and a stranger gets the same 404 as a missing id)
  if (!stack || stack.vis === "Private") error(404, "not found");
  await incrementRemix(params.id);
  return json({ ok: true });
};
