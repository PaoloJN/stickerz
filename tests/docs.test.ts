import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ARTICLES, GROUPS, SEQ, getArticle } from "../src/lib/docs/articles";

const page = readFileSync("src/routes/docs/[slug]/+page.svelte", "utf8");

describe("docs data", () => {
  it("has unique slugs", () => {
    const slugs = ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("SEQ and GROUPS cover every article exactly once", () => {
    const slugs = ARTICLES.map((a) => a.slug).sort();
    expect([...SEQ].sort()).toEqual(slugs);
    expect(GROUPS.flatMap((g) => g.items).sort()).toEqual(slugs);
  });
  it("getArticle returns undefined for unknown slugs", () => {
    expect(getArticle("nope")).toBeUndefined();
    expect(getArticle("print")?.slug).toBe("print");
  });
  it("every TOC id has a data-toc heading in the page source, and ids are unique per article", () => {
    for (const a of ARTICLES) {
      const ids = a.toc.map(([id]) => id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(page).toContain(`id="${id}" data-toc`);
    }
  });
});
