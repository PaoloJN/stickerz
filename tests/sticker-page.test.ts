import { describe, it, expect } from "vitest";
import {
  coOccurrence,
  effectiveLook,
  oftenStacked,
  printLayout,
  sizeHint,
  stickerBox,
  versionsFor,
  WORDMARK_STRETCH,
} from "@/lib/sticker-page";
import { decodeLayout, encodeLayout } from "@/lib/stickers/codec";

describe("versionsFor", () => {
  it("icon only, single art", () => {
    expect(versionsFor({ icon: { light: "/a.svg" } })).toEqual([{ variant: "icon", theme: "light", label: "Icon", light: "/a.svg", dark: "/a.svg" }]);
  });
  it("icon + wordmark with dark arts gives four versions", () => {
    const v = versionsFor({ icon: { light: "/i.svg", dark: "/i_d.svg" }, wordmark: { light: "/w.svg", dark: "/w_d.svg" } });
    expect(v.map((x) => x.label)).toEqual(["Icon", "Icon · Dark", "Full logo", "Full logo · Dark"]);
    expect(v[1]).toMatchObject({ variant: "icon", theme: "dark", dark: "/i_d.svg" });
    expect(v[3]).toMatchObject({ variant: "wordmark", theme: "dark", light: "/w.svg", dark: "/w_d.svg" });
  });
});

describe("effectiveLook", () => {
  it("die-cut follows the version", () => {
    expect(effectiveLook({ theme: "light" }, "diecut")).toEqual({ back: "diecut", theme: "light" });
    expect(effectiveLook({ theme: "dark" }, "diecut")).toEqual({ back: "diecut", theme: "dark" });
  });
  it("a light logo can't go on white: it becomes black", () => {
    expect(effectiveLook({ theme: "light" }, "white")).toEqual({ back: "white", theme: "light" });
    expect(effectiveLook({ theme: "dark" }, "white")).toEqual({ back: "black", theme: "dark" });
  });
  it("black always takes the dark-vinyl art", () => {
    expect(effectiveLook({ theme: "light" }, "black")).toEqual({ back: "black", theme: "dark" });
  });
});

describe("stickerBox", () => {
  it("die-cut icon: long side = size", () => {
    const b = stickerBox("icon", "diecut", 55, 1.1);
    expect(b.w).toBe(55);
    expect(b.h).toBeCloseTo(50);
    expect(stickerBox("icon", "diecut", 50, 0.5)).toEqual({ w: 25, h: 50 });
  });
  it("backed icon is a circle", () => expect(stickerBox("icon", "white", 45, 3)).toEqual({ w: 45, h: 45 }));
  it("wordmarks stretch; backed ones are pills", () => {
    expect(stickerBox("wordmark", "diecut", 50, 5).w).toBeCloseTo(50 * WORDMARK_STRETCH);
    expect(stickerBox("wordmark", "diecut", 50, 5).h).toBeCloseTo(19);
    expect(stickerBox("wordmark", "black", 34, 5).h).toBeCloseTo((34 * WORDMARK_STRETCH) / 3.4);
  });
  it("bad aspect falls back to square", () => expect(stickerBox("icon", "diecut", 40, Number.NaN)).toEqual({ w: 40, h: 40 }));
});

describe("sizeHint", () => {
  const air = "MacBook Air 13″";
  it("fits within 5 mm", () => {
    expect(sizeHint(55, 55, air)).toBe("55 mm sits well on a MacBook Air 13″.");
    expect(sizeHint(65, 60, "MacBook Air 15″")).toBe("65 mm sits well on a MacBook Air 15″.");
  });
  it("too small suggests the recommendation", () => expect(sizeHint(45, 65, "MacBook Pro 16″")).toBe("A little small on a MacBook Pro 16″. Try 65 mm."));
  it("too big", () => expect(sizeHint(65, 55, air)).toBe("Big on a MacBook Air 13″. Good if it’s the only sticker."));
});

describe("coOccurrence / oftenStacked", () => {
  const designs = [
    ["vercel", "next", "tailwind"],
    ["vercel", "next", "supabase"],
    ["bun", "deno"],
    ["vercel", "vercel", "stripe"],
  ];
  it("counts shared designs once each, most first, ties first-seen", () => {
    expect(coOccurrence("vercel", designs)).toEqual([
      { key: "next", n: 2 },
      { key: "tailwind", n: 1 },
      { key: "supabase", n: 1 },
      { key: "stripe", n: 1 },
    ]);
    expect(coOccurrence("nobody", designs)).toEqual([]);
  });
  const all = [
    { key: "vercel", category: "Hosting", uses: 0 },
    { key: "next", category: "Framework", uses: 0 },
    { key: "netlify", category: "Hosting", uses: 0 },
    { key: "render", category: "Hosting", uses: 2 },
    { key: "tailwind", category: "Framework", uses: 0 },
  ];
  it("co-occurring first (only known logos), then the same category by use", () => {
    expect(oftenStacked("vercel", designs, all, 8).map((x) => [x.logo.key, x.n])).toEqual([
      ["next", 2],
      ["tailwind", 1],
      ["render", 0],
      ["netlify", 0],
    ]);
  });
  it("falls back to the category with no designs, and respects n", () => {
    expect(oftenStacked("vercel", [], all, 1).map((x) => x.logo.key)).toEqual(["render"]);
    expect(oftenStacked("missing", [], all)).toEqual([]);
  });
});

describe("printLayout", () => {
  const base = { key: "vercel", variant: "icon", theme: "light", back: "diecut", size: 55, aspect: 1.1, model: "air13", color: "midnight", device: { w: 304.1, h: 215 } } as const;
  it("one centred die-cut sticker on the chosen laptop, round-tripping the share codec", () => {
    const l = printLayout(base);
    expect(l.laptop).toEqual({ model: "air13", color: "midnight" });
    expect(l.stickers).toHaveLength(1);
    expect(l.stickers[0]).toMatchObject({ logo: "vercel", shape: "diecut", x: 152.1, y: 107.5, w: 55, rot: 0 });
    const back = decodeLayout(encodeLayout(l));
    expect(back?.stickers[0]).toMatchObject({ logo: "vercel", shape: "diecut", w: 55, theme: "light" });
  });
  it("backed icons are circles, backed wordmarks are pills", () => {
    expect(printLayout({ ...base, back: "black", theme: "dark" }).stickers[0]).toMatchObject({ shape: "circle", theme: "dark" });
    expect(printLayout({ ...base, variant: "wordmark", back: "white" }).stickers[0]).toMatchObject({ shape: "square", radius: 50, variant: "wordmark" });
  });
});
