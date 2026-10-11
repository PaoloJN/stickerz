import { redirect, type Handle } from "@sveltejs/kit";
import { fillSitePlaceholders } from "$lib/server/site-html";

const COOKIE = "owner_id";
const MAX_AGE = 60 * 60 * 24 * 730; // ~2 years

/**
 * Old URLs from before the rename (logos → stickers, stacks → designs, gallery → community). Permanent, so shared
 * links and search results keep working; the query string is kept.
 */
export function renamedPath(path: string): string | null {
  const m = (re: RegExp) => path.match(re);
  let r: RegExpMatchArray | null;
  if (path === "/logos" || path === "/logos/") return "/stickers";
  if (path === "/gallery" || path === "/gallery/") return "/community";
  if (path === "/stacks" || path === "/stacks/") return "/designs";
  if ((r = m(/^\/stack\/([^/]+)\/?$/))) return `/designs/${r[1]}`;
  if ((r = m(/^\/directory\/([^/]+)\/?$/))) return `/stickers?category=${r[1]}`;
  if (path === "/favorites" || path === "/favorites/") return "/archived/favorites";
  return null;
}

export const handle: Handle = async ({ event, resolve }) => {
  const moved = renamedPath(event.url.pathname);
  if (moved) {
    const search = event.url.search.slice(1);
    redirect(308, search ? `${moved}${moved.includes("?") ? "&" : "?"}${search}` : moved);
  }
  let ownerId = event.cookies.get(COOKIE);
  if (!ownerId) {
    ownerId = crypto.randomUUID();
    event.cookies.set(COOKIE, ownerId, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: MAX_AGE,
    });
  }
  event.locals.ownerId = ownerId;
  // app.html can't import siteConfig; fill its %site.*% placeholders here
  return resolve(event, { transformPageChunk: ({ html }) => fillSitePlaceholders(html) });
};
