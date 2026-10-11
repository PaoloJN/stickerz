import { listGallery, type GallerySort } from "$lib/server/stacks";
import { artUrlsIn, cutsFor } from "$lib/stickers/cuts";
import type { PageServerLoad } from "./$types";

const SORTS: GallerySort[] = ["trending", "newest", "most-remixed"];

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get("sort");
  const sort = SORTS.find((s) => s === q) ?? "trending";
  const stacks = await listGallery(sort);
  return { stacks, sort, cuts: cutsFor(artUrlsIn(stacks.map((s) => s.layout))) };
};
