import { error } from "@sveltejs/kit";
import { getStack } from "$lib/server/stacks";
import { artUrlsIn, cutsFor } from "$lib/stickers/cuts";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  const stack = await getStack(params.id, locals.ownerId);
  if (!stack) error(404, "Design not found");
  return { stack, cuts: cutsFor(artUrlsIn([stack.layout])) };
};
