import { describe, expect, it } from "vitest";
import { applyOrder, defaultPaper, mapRows, normalizeTilt, pack, PAPERS, sheetArea, stencilTiles, tileName } from "../../src/lib/stickers/print/plan";

describe("paper", () => {
  it("defaults by region", () => {
    expect(defaultPaper("en-US")).toBe("letter");
    expect(defaultPaper("es_MX")).toBe("letter");
    expect(defaultPaper("en-GB")).toBe("a4");
    expect(defaultPaper("fr")).toBe("a4");
    expect(defaultPaper(undefined)).toBe("a4");
  });
  it("cricut area fits its Print Then Cut limit and is centred", () => {
    const a = sheetArea("letter", "cricut");
    expect(a.w).toBeCloseTo(171.45);
    expect(a.x).toBeCloseTo((PAPERS.letter.w - a.w) / 2);
  });
});

describe("pack", () => {
  const area = { w: 100, h: 100 };
  it("puts stickers in rows without overlap, inside the area", () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ id: `s${i}`, w: 30, h: 30 }));
    const { pages, tooBig } = pack(items, area, 3);
    expect(tooBig).toEqual([]);
    expect(pages).toHaveLength(1);
    const ps = pages[0];
    for (const a of ps) {
      expect(a.x + a.w).toBeLessThanOrEqual(100.001);
      expect(a.y + a.h).toBeLessThanOrEqual(100.001);
      for (const b of ps) if (a !== b) expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y).toBe(true);
    }
  });
  it("spills onto more pages, turns a sticker that only fits sideways, flags ones that never fit", () => {
    const { pages } = pack(Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, w: 45, h: 45 })), area, 3);
    expect(pages.length).toBe(3);
    const tall = pack([{ id: "t", w: 30, h: 120 }], { w: 130, h: 50 });
    expect(tall.pages[0][0]).toMatchObject({ rotated: true, w: 120, h: 30 });
    expect(pack([{ id: "x", w: 200, h: 200 }], area).tooBig).toEqual(["x"]);
  });
  it("leaves room for each sticker's number", () => {
    const { pages } = pack([{ id: "a", w: 10, h: 10 }], area, 3, 4);
    expect(pages[0][0].y).toBe(4);
  });
});

describe("order and map", () => {
  const lid = { w: 300, h: 200 };
  const s = [
    { id: "small-edge", title: "E", x: 10, y: 10, rot: 0, w: 20, h: 20 },
    { id: "big", title: "B", x: 250, y: 150, rot: 0, w: 70, h: 70 },
    { id: "small-mid", title: "M", x: 150, y: 100, rot: 370, w: 20, h: 20 },
  ];
  it("biggest first, then outward from the middle", () => {
    expect(applyOrder(s, lid)).toEqual(["big", "small-mid", "small-edge"]);
  });
  it("rows measure the centre from the left and top edges", () => {
    const rows = mapRows(s, applyOrder(s, lid));
    expect(rows[1]).toEqual({ n: 2, id: "small-mid", title: "M", left: 150, top: 100, tilt: 10, width: 20 });
    expect(normalizeTilt(-190)).toBe(170);
  });
});

describe("stencil tiles", () => {
  it("covers the whole lid with overlapping pages, choosing the orientation with fewer pages", () => {
    const lid = { w: 304.1, h: 215 };
    const { tiles } = stencilTiles(lid, "a4", 12);
    expect(tiles.length).toBeLessThanOrEqual(4);
    const right = Math.max(...tiles.map((t) => t.x + t.w));
    const bottom = Math.max(...tiles.map((t) => t.y + t.h));
    expect(right).toBeCloseTo(lid.w);
    expect(bottom).toBeCloseTo(lid.h);
    expect(tileName({ col: 1, row: 0 })).toBe("B1");
  });
});

describe("stencil split", () => {
  it("never cuts through the Apple logo", () => {
    const lid = { w: 304.1, h: 215 };
    const logo = { x: [140, 164] as [number, number], y: [94, 121] as [number, number] };
    for (const paper of ["letter", "a4"] as const) {
      const { tiles } = stencilTiles(lid, paper, 12, logo);
      // some page holds the whole logo
      expect(tiles.some((t) => t.x <= logo.x[0] && t.x + t.w >= logo.x[1] && t.y <= logo.y[0] && t.y + t.h >= logo.y[1])).toBe(true);
      expect(Math.max(...tiles.map((t) => t.x + t.w))).toBeCloseTo(lid.w);
      for (const t of tiles) expect(t.w).toBeLessThanOrEqual(PAPERS[paper].w - 20 + 1e-6);
    }
  });
});
