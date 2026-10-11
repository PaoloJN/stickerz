import { dev } from "$app/environment";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { previewSvg } from "$lib/server/sticker-review";

// DEV ONLY: /dev/stickers/preview/<file>?margin=3&smooth=50&fillHoles=1&merge=1&stripMasks=0&dark=0
export const GET: RequestHandler = async ({ params, url }) => {
  if (!dev) error(404, "Not found");
  if (!/^[\w.-]+\.svg$/.test(params.file)) error(404, "Not found");
  const q = url.searchParams;
  const num = (k: string) => (q.has(k) ? Number(q.get(k)) : undefined);
  const bool = (k: string) => (q.has(k) ? q.get(k) === "1" : undefined);
  const svg = await previewSvg(`/library/${params.file}`, { margin: num("margin"), smooth: num("smooth"), fillHoles: bool("fillHoles"), merge: bool("merge"), stripMasks: bool("stripMasks") }, q.get("dark") === "1");
  if (!svg) error(404, "Not a usable SVG");
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "no-store" } });
};
