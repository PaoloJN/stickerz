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
  if (path === "/favorites" || path === "/favorites/") return "/stickers";
  if (path === "/directory" || path === "/directory/") return "/stickers";
  return null;
}

/**
 * Public pages that read nothing per visitor, and how long Vercel's CDN may keep each one (seconds). Crawlers walk
 * these all day; served from the CDN they never wake the function or the database. A new deploy clears the cache.
 */
export function cdnTtl(path: string): number | null {
  const p = path.length > 1 ? path.replace(/\/$/, "") : path;
  if (p === "/") return 30 * 60;
  if (p === "/community") return 60;
  if (p === "/stickers" || p.startsWith("/stickers/")) return 24 * 3600;
  if (p === "/docs" || p.startsWith("/docs/") || p === "/legal" || p.startsWith("/legal/")) return 24 * 3600;
  if (p === "/support" || p === "/brands" || p === "/sitemap.xml") return 24 * 3600;
  return null;
}

export const handle: Handle = async ({ event, resolve }) => {
  const moved = renamedPath(event.url.pathname);
  if (moved) {
    const search = event.url.search.slice(1);
    redirect(308, search ? `${moved}${moved.includes("?") ? "&" : "?"}${search}` : moved);
  }
  const method = event.request.method;
  const ttl = method === "GET" || method === "HEAD" ? cdnTtl(event.url.pathname) : null;
  let ownerId = event.cookies.get(COOKIE);
  // public pages don't hand out the owner cookie: a Set-Cookie makes the response uncacheable, and none of them
  // read it. The editor, design pages and API set it the first time they're hit.
  if (!ownerId && ttl === null) {
    ownerId = crypto.randomUUID();
    event.cookies.set(COOKIE, ownerId, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: MAX_AGE,
    });
  }
  event.locals.ownerId = ownerId ?? "";
  // app.html can't import siteConfig; fill its %site.*% placeholders here
  const response = await resolve(event, { transformPageChunk: ({ html }) => fillSitePlaceholders(html) });
  if (ttl !== null && response.status === 200 && !response.headers.has("set-cookie")) {
    response.headers.set("vercel-cdn-cache-control", `max-age=${ttl}, stale-while-revalidate=${ttl * 7}`);
  }
  return response;
};
