import { siteConfig } from "@/config/site";
import { ARTICLES } from "$lib/docs/articles";
import { LEGAL_DOCS } from "$lib/legal/docs";
import { LOGOS } from "$lib/stickers/logos";
import { listPublicIds } from "$lib/server/stacks";
import { buildSitemap, type SitemapEntry } from "$lib/sitemap";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  const entries: SitemapEntry[] = [
    { path: "/" },
    { path: "/community" },
    { path: "/stickers" },
    { path: "/support" },
    { path: "/brands" },
    ...ARTICLES.map((a) => ({ path: `/docs/${a.slug}` })),
    ...LEGAL_DOCS.map((d) => ({ path: `/legal/${d.slug}` })),
    ...LOGOS.map((l) => ({ path: `/stickers/${encodeURIComponent(l.key)}` })),
  ];
  // a database hiccup still serves the static part rather than failing the whole sitemap
  try {
    for (const d of await listPublicIds()) entries.push({ path: `/designs/${encodeURIComponent(d.id)}`, lastmod: d.updatedAt });
  } catch (e) {
    console.warn("sitemap: public designs unavailable", e);
  }
  return new Response(buildSitemap(siteConfig.url, entries), {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
};
