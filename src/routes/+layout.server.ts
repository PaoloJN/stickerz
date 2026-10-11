import type { LayoutServerLoad } from "./$types";
import { getStars } from "$lib/server/github";
import { cutsFor } from "$lib/stickers/cuts";
import { ERROR_STICKERS } from "$lib/site/error-stickers";

export const load: LayoutServerLoad = async () => ({
  stars: await getStars(),
  // the error page can't have its own load, so its decorative sticker outlines ride along here
  errorCuts: cutsFor(ERROR_STICKERS.map((s) => s.href)),
});
