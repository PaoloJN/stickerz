import { describe, it, expect } from "vitest";
import { fillSitePlaceholders } from "@/lib/server/site-html";
import { siteConfig } from "@/config/site";

describe("fillSitePlaceholders", () => {
  it("fills author, url and name from siteConfig", () => {
    const html = `<meta name="author" content="%site.author%" /><meta property="og:url" content="%site.url%" /><title>%site.name%</title>`;
    expect(fillSitePlaceholders(html)).toBe(
      `<meta name="author" content="@${siteConfig.author.x}" /><meta property="og:url" content="${siteConfig.url}" /><title>${siteConfig.name}</title>`,
    );
  });

  it("replaces every occurrence and leaves other text alone", () => {
    const out = fillSitePlaceholders("%site.author% %site.author% %sveltekit.head%");
    expect(out).toBe(`@${siteConfig.author.x} @${siteConfig.author.x} %sveltekit.head%`);
    expect(out).not.toContain("%site.");
  });
});
