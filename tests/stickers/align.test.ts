import { expect, test } from "vitest";
import { align, distribute, gridSpots, type Box } from "@/lib/stickers/ops";

const b = (id: string, x: number, y: number, hw = 5, hh = 5, locked = false): Box => ({ id, x, y, hw, hh, locked });

test("align to shared edges and centres, skipping locked", () => {
  const boxes = [b("a", 10, 10), b("b", 50, 40, 10, 2), b("c", 30, 70, 5, 5, true)];
  expect(align(boxes, "left")).toEqual({ a: { x: 10 }, b: { x: 15 } });
  expect(align(boxes, "right")).toEqual({ a: { x: 55 }, b: { x: 50 } });
  expect(align(boxes, "hcenter")).toEqual({ a: { x: 32.5 }, b: { x: 32.5 } });
  expect(align(boxes, "top")).toEqual({ a: { y: 10 }, b: { y: 7 } });
  expect(align(boxes, "bottom")).toEqual({ a: { y: 70 }, b: { y: 73 } });
});

test("distribute spaces centres evenly and needs three", () => {
  expect(distribute([b("a", 0, 0), b("b", 100, 0)], "x")).toEqual({});
  expect(distribute([b("a", 0, 0), b("c", 90, 0), b("b", 10, 0)], "x")).toEqual({ a: { x: 0 }, b: { x: 45 }, c: { x: 90 } });
});

test("gridSpots stays on the lid", () => {
  const spots = gridSpots(7, { w: 300, h: 200 });
  expect(spots).toHaveLength(7);
  for (const s of spots) {
    expect(s.x).toBeGreaterThan(0);
    expect(s.x).toBeLessThan(300);
    expect(s.y).toBeGreaterThan(0);
    expect(s.y).toBeLessThan(200);
  }
});
