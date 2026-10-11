import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import * as opentypeNs from "opentype.js";
import { artHrefs, designOgSvg, OG, textPath, wrapText } from "$lib/server/og";
import type { Layout } from "$lib/stickers/types";
import { DEFAULT_STYLE } from "$lib/stickers/style";

const opentype = (opentypeNs as unknown as { default?: typeof opentypeNs }).default ?? opentypeNs;
const font = (f: string) => opentype.parse(new Uint8Array(readFileSync(`scripts/fonts/${f}`)).buffer);
const fonts = { bold: font("Geist-Bold.ttf"), regular: font("Geist-Regular.ttf") };

const sticker = (logo: string, x: number, y: number, extra: Partial<Layout["stickers"][number]> = {}): Layout["stickers"][number] => ({
  ...DEFAULT_STYLE,
  id: `${logo}-${x}`,
  logo,
  variant: "icon",
  theme: "light",
  locked: false,
  x,
  y,
  w: 30,
  rot: 5,
  ...extra,
});

const layout: Layout = {
  v: 1,
  laptop: { model: "air13", color: "midnight" },
  stickers: [sticker("react", 60, 60), sticker("typescript", 150, 100), sticker("react", 230, 140), sticker("nope", 10, 10)],
};

describe("wrapText", () => {
  it("keeps a short name on one line", () => {
    expect(wrapText(fonts.bold, "Frontend 2026", 56, 440, 3)).toEqual(["Frontend 2026"]);
  });
  it("wraps long names and caps the line count with an ellipsis", () => {
    const lines = wrapText(fonts.bold, "a very long design name that goes on and on and on forever", 56, 440, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("…")).toBe(true);
    for (const l of lines) expect(fonts.bold.getAdvanceWidth(l, 56)).toBeLessThanOrEqual(440);
  });
  it("cuts a single word wider than the box", () => {
    const [l] = wrapText(fonts.bold, "Supercalifragilisticexpialidocious2026", 56, 300, 1);
    expect(l.endsWith("…")).toBe(true);
    expect(fonts.bold.getAdvanceWidth(l, 56)).toBeLessThanOrEqual(300);
  });
});

describe("textPath", () => {
  it("never emits NaN coordinates, wherever the text sits", () => {
    for (const [font, s, size] of [[fonts.regular, "12 stickers · MacBook Air 13″ · Silver", 24], [fonts.regular, "6 stickers", 24], [fonts.bold, "Client work", 56]] as const)
      for (const [x, y] of [[64, 300], [64, 230], [0, 0], [112, 572]]) {
        const p = textPath(font, s, x, y, size, "#fff");
        expect(p).not.toContain("NaN");
        expect(p).toMatch(/^<path d="M-?[\d.]+ -?[\d.]+/);
      }
  });
});

describe("designOgSvg", () => {
  const hrefs = artHrefs(layout);
  const art = Object.fromEntries(hrefs.map((h) => [h, `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'/>`).toString("base64")}`]));
  const cuts = Object.fromEntries(hrefs.map((h) => [h, { d: "M-50 -50H50V50H-50Z", aspect: 1 }]));

  it("dedupes art hrefs and skips unknown logos", () => {
    expect(hrefs).toHaveLength(2);
  });

  it("is a 1200×630 card with the name as paths and one image per sticker", () => {
    const svg = designOgSvg({ layout, name: "Frontend <2026>", cuts, art, fonts });
    expect(svg.startsWith(`<svg xmlns="http://www.w3.org/2000/svg" width="${OG.w}" height="${OG.h}"`)).toBe(true);
    expect(svg).toContain("<title>Frontend &lt;2026&gt;</title>");
    expect((svg.match(/<image /g) ?? []).length).toBe(3); // three known stickers, no icon
    expect((svg.match(/filter="url\(#lift\)"/g) ?? []).length).toBe(3);
    expect(svg).not.toContain("<text"); // text is outlined
  });

  it("falls back to a tile when a sticker has no cut, and skips art it can't load", () => {
    const svg = designOgSvg({ layout, name: "x", cuts: {}, art: { [hrefs[0]]: art[hrefs[0]] }, fonts });
    expect((svg.match(/<image /g) ?? []).length).toBe(2); // react twice, typescript missing
    expect(svg).toContain('rx="3.6"'); // rounded tile, w*0.12
    expect(svg).not.toContain("<path d=\"M-50");
  });
});
