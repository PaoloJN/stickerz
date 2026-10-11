import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getStack } from "$lib/server/stacks";
import { artUrlsIn, cutsFor } from "$lib/stickers/cuts";
import { designOgPng } from "$lib/server/og";

/**
 * Social card for one design (linked from the design page's og:image). Same visibility rule as the page: a private
 * design is a 404 for anyone but its owner, which is also what link scrapers get.
 */
export const GET: RequestHandler = async ({ params, locals, fetch, setHeaders }) => {
  const stack = await getStack(params.id, locals.ownerId);
  if (!stack) error(404, "Design not found");
  const png = await designOgPng({ layout: stack.layout, name: stack.name, cuts: cutsFor(artUrlsIn([stack.layout])) }, fetch);
  setHeaders({
    "content-type": "image/png",
    // the page links it with ?v=<edited>, so a long shared cache is safe
    "cache-control": "public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400",
  });
  return new Response(png.slice().buffer as ArrayBuffer);
};
