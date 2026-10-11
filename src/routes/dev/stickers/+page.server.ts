import { dev } from "$app/environment";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { listItems, readReview } from "$lib/server/sticker-review";

// DEV ONLY: the sticker review page reads and writes repo files
export const load: PageServerLoad = () => {
  if (!dev) error(404, "Not found");
  return { items: listItems(), review: readReview() };
};
