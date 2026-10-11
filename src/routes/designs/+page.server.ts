import { listMine } from "$lib/server/stacks";
import { artUrlsIn, cutsFor } from "$lib/stickers/cuts";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const stacks = await listMine(locals.ownerId);
  return { stacks, cuts: cutsFor(artUrlsIn(stacks.map((s) => s.layout))) };
};
