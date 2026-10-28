import { describe, expect, it } from "vitest";
import { cdnTtl } from "../../src/hooks.server";

describe("cdnTtl", () => {
  it("caches the public pages crawlers walk", () => {
    for (const p of ["/", "/stickers", "/stickers/groq", "/stickers/groq/", "/docs/works", "/legal/privacy", "/support", "/brands", "/sitemap.xml", "/community"]) {
      expect(cdnTtl(p), p).toBeGreaterThan(0);
    }
  });
  it("never caches pages that depend on the visitor's cookie", () => {
    for (const p of ["/editor", "/designs", "/designs/abc", "/designs/abc/og.png", "/api/stacks", "/dev/stickers", "/editor/saved/x"]) {
      expect(cdnTtl(p), p).toBeNull();
    }
  });
});
