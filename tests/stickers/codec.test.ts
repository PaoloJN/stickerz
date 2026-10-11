import { expect, test } from "vitest";
import { decodeLayout, encodeLayout, MAX_STICKERS, sanitizeLayout } from "@/lib/stickers/codec";
import { DEFAULT_STYLE } from "@/lib/stickers/style";
import type { Layout } from "@/lib/stickers/types";
import { compressToEncodedURIComponent } from "lz-string";

const known = (k: string) => k !== "ghost";
const layout: Layout = {
  v: 1, laptop: { model: "air13", color: "silver" },
  stickers: [
    { id: "a", logo: "vercel", variant: "icon", theme: "dark", locked: true, ...DEFAULT_STYLE, finish: "holo", x: 100.26, y: 50, w: 60, rot: -12 },
    {
      id: "b", logo: "supabase", variant: "wordmark", theme: "light", locked: false,
      shape: "square", radius: 40, fill: "clear", logoColor: "#ff6a3d", pad: 70, border: false, borderColor: "holo", borderWidth: 2.5, finish: "gloss", lift: 80,
      outline: true, outlineColor: "#3b82f6", outlineWidth: 0.75, smooth: 60, fillHoles: false, merge: false, contour: "tight",
      x: 10, y: 20, w: 40, rot: 0, colors: { "#3ecf8e": "#ff6a3d" },
    },
  ],
};

test("round-trips (ids regenerated, numbers rounded to 0.1mm)", () => {
  const out = decodeLayout(encodeLayout(layout), known)!;
  expect(out.laptop).toEqual(layout.laptop);
  expect(out.stickers.map(({ id, ...s }) => s)).toEqual(layout.stickers.map(({ id, ...s }) => ({ ...s, x: Math.round(s.x * 10) / 10 })));
  expect(new Set(out.stickers.map((s) => s.id)).size).toBe(2);
});

test("garbage input never throws", () => {
  for (const g of ["", "xyz", "%%%", encodeURIComponent("[1,2,3]"), "N4Ig"]) {
    expect(() => decodeLayout(g, known)).not.toThrow();
  }
  expect(decodeLayout("xyz", known)).toBeNull();
});

test("sanitize drops unknown logos, clamps values, fills defaults", () => {
  const out = sanitizeLayout({
    v: 1, laptop: { model: "nope", color: 3 },
    stickers: [
      { logo: "ghost", x: 1, y: 1, w: 50 },
      { logo: "vercel", x: Number.NaN, y: 9999, w: 9999, rot: 540, shape: "blob", variant: "x", theme: "y", holo: "yes", fill: "red", logoColor: "#12", pad: 500, borderWidth: -1, finish: "foil", lift: 1e9, border: "no" },
      "junk",
    ],
  }, known)!;
  expect(out.laptop).toEqual({ model: "pro14", color: "space-black" });
  expect(out.stickers).toHaveLength(1);
  const s = out.stickers[0];
  expect(s).toMatchObject({ logo: "vercel", w: 200, rot: 180, shape: "diecut", variant: "icon", theme: "light", y: 221.2, locked: false });
  expect(s).toMatchObject({ ...DEFAULT_STYLE, pad: 90, borderWidth: 0.5, lift: 100 });
  expect(s.x).toBeCloseTo(312.6 / 2);
});

test("caps sticker count and rejects wrong version", () => {
  const many = { v: 1, laptop: layout.laptop, stickers: Array.from({ length: 500 }, () => ({ logo: "vercel", x: 1, y: 1, w: 20 })) };
  expect(sanitizeLayout(many, known)!.stickers).toHaveLength(MAX_STICKERS);
  expect(sanitizeLayout({ v: 2, laptop: layout.laptop, stickers: [] }, known)).toBeNull();
});

test("links from before sticker styles still decode, legacy holo flag becomes the holo finish", () => {
  const old = compressToEncodedURIComponent(JSON.stringify([1, "air13", "silver", [["vercel", 0, 1, 1, 1, 20, 30, 40, 5]]]));
  const s = decodeLayout(old, known)!.stickers[0];
  expect(s).toMatchObject({ ...DEFAULT_STYLE, shape: "circle", finish: "holo", locked: false, x: 20, y: 30, w: 40, rot: 5 });
});

test("stack name round-trips, trimmed and capped", () => {
  const out = decodeLayout(encodeLayout({ ...layout, name: "Work laptop" }), known)!;
  expect(out.name).toBe("Work laptop");
  expect(decodeLayout(encodeLayout(layout), known)!.name).toBeUndefined();
  expect(sanitizeLayout({ ...layout, name: "  " + "x".repeat(99) }, known)!.name).toHaveLength(60);
});
