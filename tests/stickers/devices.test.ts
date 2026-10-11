import { expect, test } from "vitest";
import { DEFAULT_DEVICE, DEVICE_LIST, DEVICES, deviceGroups, getDevice, getFinish } from "@/lib/stickers/devices";
import { sanitizeLayout } from "@/lib/stickers/codec";

test("registry is well formed", () => {
  expect(new Set(DEVICE_LIST.map((d) => d.id)).size).toBe(DEVICE_LIST.length);
  for (const d of DEVICE_LIST) {
    expect(d.w).toBeGreaterThan(d.h * 0.3);
    expect(d.finishes.length).toBeGreaterThan(0);
    expect(d.noun).toMatch(/^[a-z][a-z ]+$/);
    expect(new Set(d.finishes.map((f) => f.id)).size).toBe(d.finishes.length);
    for (const f of d.finishes) {
      expect(f.base).toMatch(/^#[0-9a-f]{6}$/i);
      expect(f.logo).toMatch(/^#[0-9a-f]{6}$/i);
    }
    if (d.mark) expect(d.mark.h).toBeLessThan(d.h);
  }
  expect(getFinish(DEVICES[DEFAULT_DEVICE.model], DEFAULT_DEVICE.color).id).toBe(DEFAULT_DEVICE.color);
  expect(deviceGroups().flatMap((g) => g.devices)).toHaveLength(DEVICE_LIST.length);
});

test("unknown ids fall back", () => {
  expect(getDevice("nope").id).toBe(DEFAULT_DEVICE.model);
  expect(getFinish(getDevice("air13"), "nope").id).toBe(getDevice("air13").finishes[0].id);
});

test("sanitize drops colors the device doesn't come in", () => {
  expect(sanitizeLayout({ v: 1, laptop: { model: "pro14", color: "starlight" }, stickers: [] })!.laptop).toEqual({ model: "pro14", color: "space-black" });
  expect(sanitizeLayout({ v: 1, laptop: { model: "air13", color: "sky" }, stickers: [] })!.laptop).toEqual({ model: "air13", color: "sky-blue" });
});

test("starter packs only use known logos", async () => {
  const { PACKS } = await import("@/lib/stickers/packs");
  const { isKnownLogo } = await import("@/lib/stickers/logos");
  for (const p of PACKS) for (const k of p.logos) expect(isKnownLogo(k), k).toBe(true);
});
