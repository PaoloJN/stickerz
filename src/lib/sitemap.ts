/** A sitemap entry: an absolute or root-relative path, plus an optional last-modified date. */
export type SitemapEntry = { path: string; lastmod?: Date };

const XML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
const escapeXml = (s: string) => s.replace(/[&<>"']/g, (c) => XML_ESCAPES[c]);

/** Build a sitemaps.org urlset. `base` is the site origin (no trailing slash needed). */
export function buildSitemap(base: string, entries: SitemapEntry[]): string {
  const origin = base.replace(/\/+$/, "");
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const e of entries) {
    const loc = origin + (e.path.startsWith("/") ? e.path : `/${e.path}`);
    if (seen.has(loc)) continue;
    seen.add(loc);
    const lastmod = e.lastmod && !Number.isNaN(e.lastmod.getTime()) ? `<lastmod>${e.lastmod.toISOString()}</lastmod>` : "";
    urls.push(`  <url><loc>${escapeXml(loc)}</loc>${lastmod}</url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}
