import { describe, it, expect } from "vitest";
import { cutFor, cutsFor, artUrlsIn, CANON } from "$lib/stickers/cuts";
import { LOGO_BY_KEY, artFor } from "$lib/stickers/logos";
import { buildLayout, toKeys } from "$lib/stacks/mock";

describe("cuts", () => {
  it("has a well-formed path for common logos", () => {
    for (const key of ["vercel", "react", "figma", "tailwindcss"]) {
      const logo = LOGO_BY_KEY.get(key)!;
      const c = cutFor(artFor(logo, "icon", "light"));
      expect(c, key).not.toBeNull();
      expect(c!.d.startsWith("M")).toBe(true);
      expect(c!.d.length).toBeGreaterThan(20);
      expect(c!.aspect).toBeGreaterThan(0.2);
    }
  });
  it("returns null for unknown art and never throws", () => {
    expect(cutFor("/library/does-not-exist.svg")).toBeNull();
    expect(cutsFor(["/library/does-not-exist.svg"])).toEqual({});
  });
  it("collects the art urls of a layout", () => {
    const layout = buildLayout(toKeys(["vercel", "react"]), "silver", 1);
    const urls = artUrlsIn([layout]);
    expect(urls.length).toBe(2);
    expect(Object.keys(cutsFor(urls)).length).toBe(2);
  });
  it("canonical box is 100mm", () => expect(CANON.artW).toBe(100));
});
