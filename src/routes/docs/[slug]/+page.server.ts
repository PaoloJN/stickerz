import { error } from "@sveltejs/kit";
import { getArticle } from "$lib/docs/articles";

export const load = ({ params }) => {
  if (!getArticle(params.slug)) error(404, "Not found");
  return { slug: params.slug };
};
