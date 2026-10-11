import { expect, test } from "vitest";
import { clampWidth, normalizeDeg, rotatedExtents, rotatePoint, rotationFromPointer, stickerBox, stickerGeometry, widthFromPointer } from "@/lib/stickers/geometry";

test("normalizeDeg into (-180,180]", () => {
  expect(normalizeDeg(190)).toBe(-170);
  expect(normalizeDeg(-180)).toBe(180);
  expect(normalizeDeg(720)).toBe(0);
});

test("clampWidth bounds and NaN", () => {
  expect(clampWidth(5)).toBe(10);
  expect(clampWidth(500)).toBe(200);
  expect(clampWidth(Number.NaN)).toBe(50);
});

test("rotatePoint 90deg", () => {
  const p = rotatePoint(10, 0, 0, 0, 90);
  expect(p.x).toBeCloseTo(0);
  expect(p.y).toBeCloseTo(10);
});

test("rotationFromPointer: handle above centre = 0, right = 90, snapping", () => {
  expect(rotationFromPointer(0, 0, 0, -10)).toBeCloseTo(0);
  expect(rotationFromPointer(0, 0, 10, 0)).toBeCloseTo(90);
  expect(rotationFromPointer(0, 0, 10, -9, true) % 15).toBe(0);
});

test("widthFromPointer works in local space for rotated stickers and keeps aspect", () => {
  // unrotated, pointer at corner (+30,+15) with h/w = 0.5 -> width 60
  expect(widthFromPointer({ x: 0, y: 0, rot: 0 }, 30, 15, 0.5)).toBeCloseTo(60);
  // rotated 90: same local corner lands at world (-15,+30)
  expect(widthFromPointer({ x: 0, y: 0, rot: 90 }, -15, 30, 0.5)).toBeCloseTo(60);
  // height-dominant pointer drives width via aspect
  expect(widthFromPointer({ x: 0, y: 0, rot: 0 }, 5, 40, 0.5)).toBeCloseTo(160);
  expect(widthFromPointer({ x: 0, y: 0, rot: 0 }, 500, 0, 1)).toBe(200);
});

test("stickerBox: diecut follows aspect, others are square", () => {
  expect(stickerBox({ w: 60, shape: "diecut" }, 2)).toEqual({ w: 60, h: 30 });
  expect(stickerBox({ w: 60, shape: "circle" }, 2)).toEqual({ w: 60, h: 60 });
  expect(stickerBox({ w: 60, shape: "diecut" }, 0)).toEqual({ w: 60, h: 60 });
});

test("stickerGeometry: logo padding, hex inset, rounded wordmark pill", () => {
  expect(stickerGeometry({ w: 100, shape: "circle", pad: 50 }, 1)).toEqual({ w: 100, h: 100, artW: 50, artH: 50 });
  expect(stickerGeometry({ w: 100, shape: "hex", pad: 50 }, 1).artW).toBeCloseTo(44);
  const pill = stickerGeometry({ w: 100, shape: "square", pad: 80, variant: "wordmark" }, 4);
  expect(pill).toMatchObject({ w: 100, artW: 80, artH: 20 });
  expect(pill.h).toBeCloseTo(36);
});

test("rotatedExtents", () => {
  expect(rotatedExtents(40, 20, 0)).toEqual({ hw: 20, hh: 10 });
  const r = rotatedExtents(40, 20, 90);
  expect(r.hw).toBeCloseTo(10);
  expect(r.hh).toBeCloseTo(20);
});
