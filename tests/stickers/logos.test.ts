import { expect, test } from "vitest";
import { artFor, buildLogos, logoKey, LOGOS, LOGO_BY_KEY } from "@/lib/stickers/logos";

test("logoKey strips folder, extension and theme suffix", () => {
  expect(logoKey({ route: "/library/nextjs_icon_dark.svg" })).toBe("nextjs_icon");
  expect(logoKey({ route: { light: "/library/vercel-light.svg", dark: "/library/vercel-dark.svg" } })).toBe("vercel");
  expect(logoKey({ route: "/library/supabase.svg" })).toBe("supabase");
});

test("real logo dataset yields unique keys and a big catalog", () => {
  expect(LOGOS.length).toBeGreaterThan(600);
  expect(new Set(LOGOS.map((l) => l.key)).size).toBe(LOGOS.length);
  expect(LOGO_BY_KEY.size).toBe(LOGOS.length);
});

test("duplicate routes collapse to the first entry", () => {
  const out = buildLogos([
    { title: "PyCharm A", category: "Software", route: "/library/pycharm.svg", url: "x" },
    { title: "PyCharm B", category: "Software", route: "/library/pycharm.svg", url: "x" },
  ]);
  expect(out.map((l) => l.title)).toEqual(["PyCharm A"]);
});

test("artFor picks variant/theme with fallbacks", () => {
  const [l] = buildLogos([{ title: "X", category: ["AI"], route: { light: "/l.svg", dark: "/d.svg" }, wordmark: "/w.svg", url: "x" }]);
  expect(artFor(l, "icon", "light")).toBe("/l.svg");
  expect(artFor(l, "icon", "dark")).toBe("/d.svg");
  expect(artFor(l, "wordmark", "dark")).toBe("/w.svg");
  const [plain] = buildLogos([{ title: "Y", category: "AI", route: "/y.svg", url: "x" }]);
  expect(artFor(plain, "wordmark", "dark")).toBe("/y.svg");
});
