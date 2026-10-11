import { expect, test } from "vitest";
import { cutPath, type Alpha, type CutOpts } from "@/lib/stickers/cut";

/** 100×100 coverage from a predicate over [0,1)² */
function alpha(fn: (x: number, y: number) => boolean, w = 100, h = 100): Alpha {
  const data = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[y * w + x] = fn((x + 0.5) / w, (y + 0.5) / h) ? 1 : 0;
  return { w, h, data };
}

const opts: CutOpts = { artW: 40, artH: 40, margin: 2, smooth: 0, fillHoles: false, merge: false };
const loops = (d: string) => (d.match(/M/g) ?? []).length;
function bounds(d: string) {
  const n = [...d.matchAll(/-?\d+(\.\d+)?/g)].map((m) => Number(m[0]));
  const xs = n.filter((_, i) => i % 2 === 0);
  const ys = n.filter((_, i) => i % 2 === 1);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

const disc = alpha((x, y) => Math.hypot(x - 0.5, y - 0.5) < 0.4);
const ring = alpha((x, y) => Math.hypot(x - 0.5, y - 0.5) < 0.4 && Math.hypot(x - 0.5, y - 0.5) > 0.2);
const pair = alpha((x, y) => y > 0.3 && y < 0.7 && (x < 0.3 || x > 0.7));

test("grows the logo by the margin, evenly", () => {
  // disc radius 16mm + 2mm margin
  const b = bounds(cutPath(disc, opts));
  for (const v of [b.x1, b.y1, -b.x0, -b.y0]) expect(v).toBeCloseTo(18, 0);
});

test("rounds corners instead of squaring them", () => {
  const square = alpha(() => true);
  const d = cutPath(square, { ...opts, margin: 4 });
  const b = bounds(d);
  expect(b.x1).toBeCloseTo(24, 0);
  // a square-kernel dilation would put a point at the far corner (24, 24); a round offset stays inside it
  const n = [...d.matchAll(/-?\d+(\.\d+)?/g)].map((m) => Number(m[0]));
  let far = 0;
  for (let i = 0; i < n.length; i += 2) if (n[i] > 20 && n[i + 1] > 20) far = Math.max(far, Math.hypot(n[i] - 20, n[i + 1] - 20));
  expect(far).toBeLessThan(4.5);
});

test("holes stay open unless filled", () => {
  expect(loops(cutPath(ring, { ...opts, margin: 0.5 }))).toBe(2);
  expect(loops(cutPath(ring, { ...opts, margin: 0.5, fillHoles: true }))).toBe(1);
});

test("separate parts merge into one piece", () => {
  expect(loops(cutPath(pair, opts))).toBe(2);
  expect(loops(cutPath(pair, { ...opts, merge: true }))).toBe(1);
});

test("empty art gives no path", () => {
  expect(cutPath(alpha(() => false), opts)).toBe("");
});

test("fast enough to recompute while resizing", () => {
  const t = performance.now();
  for (let i = 0; i < 10; i++) cutPath(pair, { ...opts, artW: 40 + i, smooth: 3, fillHoles: true, merge: true });
  expect((performance.now() - t) / 10).toBeLessThan(60);
});
