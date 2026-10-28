import { listGallery, type GallerySort } from "$lib/server/stacks";
import { artUrlsIn, cutsFor } from "$lib/stickers/cuts";
import type { PageServerLoad } from "./$types";

const SORTS: GallerySort[] = ["trending", "newest", "most-remixed"];

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get("sort");
  const sort = SORTS.find((s) => s === q) ?? "trending";
  // live, not the snapshot: people come here right after sharing to see their design
  const stacks = await listGallery(sort, 60, { live: true });
  return { stacks, sort, cuts: cutsFor(artUrlsIn(stacks.map((s) => s.layout))) };
};
