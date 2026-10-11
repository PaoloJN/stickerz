import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { normalizeSvg } from "../../src/lib/stickers/svg-normalize";

describe("normalizeSvg", () => {
  it("promotes mask-type from style to an attribute", () => {
    const src = `<svg><mask id="m" style="mask-type: alpha;"><circle r="1"/></mask><mask id="n" style="mask-type:luminance"/></svg>`;
    const out = normalizeSvg(src);
    expect(out).toContain(`<mask mask-type="alpha" id="m" style="mask-type: alpha;">`);
    expect(out).toContain(`<mask mask-type="luminance" id="n" style="mask-type:luminance"/>`);
  });
  it("leaves masks that already have the attribute, and everything else, alone", () => {
    const src = `<svg><mask mask-type="alpha" id="m" style="mask-type: alpha"/><path style="fill:#000"/></svg>`;
    expect(normalizeSvg(src)).toBe(src);
    expect(normalizeSvg(normalizeSvg(src))).toBe(normalizeSvg(src));
  });
  it("drops wide-gamut color() declarations and keeps the sRGB fallback before them", () => {
    const src = `<svg><path fill="#863bff" style="fill:#863bff;fill:color(display-p3 .5252 .23 1);fill-opacity:1"/><stop style="stop-color:#fff;stop-color:color(display-p3 1 1 1)"/></svg>`;
    expect(normalizeSvg(src)).toBe(`<svg><path fill="#863bff" style="fill:#863bff;fill-opacity:1"/><stop style="stop-color:#fff"/></svg>`);
  });
  it("leaves no library file with a style-only mask-type", () => {
    const dir = "static/library";
    const bad = readdirSync(dir)
      .filter((f) => f.endsWith(".svg"))
      .filter((f) => /<mask\b(?![^>]*\smask-type=)[^>]*style="[^"]*mask-type/i.test(normalizeSvg(readFileSync(`${dir}/${f}`, "utf8"))));
    expect(bad).toEqual([]);
  });
});
