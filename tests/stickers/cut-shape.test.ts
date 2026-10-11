import { describe, expect, it } from "vitest";
import { alphaBounds, buildCut, shapePath, type Rasterize } from "../../src/lib/stickers/cut-build";
import type { Alpha } from "../../src/lib/stickers/cut";

/** a w×h alpha with a painted rectangle */
function alpha(w: number, h: number, box: [number, number, number, number]): Alpha {
  const data = new Float32Array(w * h);
  for (let y = box[1]; y < box[3]; y++) for (let x = box[0]; x < box[2]; x++) data[y * w + x] = 1;
  return { w, h, data };
}

describe("shape cuts", () => {
  it("finds the painted bounds", () => {
    expect(alphaBounds(alpha(10, 10, [2, 3, 7, 9]))).toEqual([2, 3, 7, 9]);
    expect(alphaBounds(alpha(10, 10, [0, 0, 0, 0]))).toBeNull();
  });

  it("draws a circle around a square logo, margin included, centred on the paint", () => {
    // 100 px art box, logo paints the middle 60 px → 60 mm wide at the canonical 100 mm, radius 30 + 3
    const d = shapePath(alpha(100, 100, [20, 20, 80, 80]), "circle", 100, 3);
    expect(d).toBe("M-33 0a33 33 0 1 0 66 0a33 33 0 1 0 -66 0Z");
  });

  it("uses the diagonal for a tall logo so its corners stay on the vinyl", () => {
    const d = shapePath(alpha(100, 100, [40, 10, 60, 90]), "circle", 100, 0);
    const r = Number(d.match(/^M(-?[\d.]+)/)![1]) * -1;
    expect(r).toBeCloseTo(Math.hypot(20, 80) / 2, 1);
  });

  it("draws a rounded square on the longer side", () => {
    const d = shapePath(alpha(100, 100, [10, 30, 90, 70]), "square", 100, 2);
    expect(d.startsWith("M")).toBe(true);
    expect(d).toContain("h"); // straight edges
    expect(d.endsWith("Z")).toBe(true);
  });

  it("buildCut picks the shape over tracing and keeps the art aspect", () => {
    const raster: Rasterize = () => alpha(200, 100, [50, 25, 150, 75]);
    const cut = buildCut("<svg/>", { shape: "circle", margin: 3 }, raster);
    expect(cut?.aspect).toBe(2);
    expect(cut?.d).toMatch(/^M-?[\d.]+ -?[\d.]+a/);
    const traced = buildCut("<svg/>", {}, raster);
    expect(traced?.d).not.toBe(cut?.d);
  });
});
