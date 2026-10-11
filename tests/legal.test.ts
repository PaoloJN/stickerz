import { describe, expect, it } from "vitest";
import { getLegalDoc, LEGAL_ALIASES, LEGAL_DOCS } from "../src/lib/legal/docs";

describe("legal docs", () => {
  it("has unique slugs", () => {
    const slugs = LEGAL_DOCS.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("resolves aliases to real docs", () => {
    expect(LEGAL_ALIASES.tm).toBe("trademark");
    for (const target of Object.values(LEGAL_ALIASES)) expect(getLegalDoc(target)).toBeDefined();
  });
  it("returns undefined for unknown slugs", () => {
    expect(getLegalDoc("x")).toBeUndefined();
  });
  it("every doc has at least 3 short bullets", () => {
    for (const d of LEGAL_DOCS) expect(d.short.length).toBeGreaterThanOrEqual(3);
  });
});
