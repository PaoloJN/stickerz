import { describe, expect, it } from "vitest";
import { buildSitemap } from "@/lib/sitemap";

describe("buildSitemap", () => {
  const xml = buildSitemap("https://stickerz.dev/", [
    { path: "/" },
    { path: "/designs/a&b", lastmod: new Date("2026-10-01T12:00:00Z") },
    { path: "community" },
    { path: "/" },
  ]);

  it("is a sitemaps.org urlset", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trim().endsWith("</urlset>")).toBe(true);
  });
  it("makes absolute locs without double slashes and dedupes", () => {
    expect(xml.match(/<loc>https:\/\/stickerz\.dev\/<\/loc>/g)).toHaveLength(1);
    expect(xml).toContain("<loc>https://stickerz.dev/community</loc>");
  });
  it("escapes XML and writes lastmod as ISO", () => {
    expect(xml).toContain("<loc>https://stickerz.dev/designs/a&amp;b</loc><lastmod>2026-10-01T12:00:00.000Z</lastmod>");
  });
  it("omits lastmod when unknown", () => {
    expect(xml).toContain("<url><loc>https://stickerz.dev/</loc></url>");
  });
});
