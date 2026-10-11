import { describe, it, expect } from "vitest";
import {
  categoryList,
  filterLogos,
  formatCount,
  hashKey,
  hashRot,
  oftenWith,
  parsePicks,
  preview,
  rowCapacity,
  sections,
  sheetOrder,
  stepKey,
  togglePick,
  useLabel,
  type PageLogo,
  pageArt,
} from "@/lib/logos-page";

const logo = (key: string, title: string, category: string, uses = 0): PageLogo => ({
  key,
  title,
  category,
  href: `/library/${key}.svg`,
  hrefDark: `/library/${key}.svg`,
  uses,
});
const LIST = [
  logo("vercel", "Vercel", "Hosting", 3),
  logo("nextjs", "Next.js", "Framework", 1),
  logo("svelte", "Svelte", "Framework", 4),
  logo("postgres", "PostgreSQL", "Database"),
];

describe("hashRot", () => {
  it("is deterministic", () => expect(hashRot("vercel")).toBe(hashRot("vercel")));
  it("stays within −6..6 degrees as an integer", () => {
    for (const k of ["a", "vercel", "nextjs_icon", "x".repeat(200), "", "tailwindcss", "ünïcødé"]) {
      const r = hashRot(k);
      expect(Number.isInteger(r)).toBe(true);
      expect(r).toBeGreaterThanOrEqual(-6);
      expect(r).toBeLessThanOrEqual(6);
    }
  });
  it("varies across keys", () => {
    const rots = new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map(hashRot));
    expect(rots.size).toBeGreaterThan(1);
  });
  it("hashKey is an unsigned 32-bit int", () => {
    const h = hashKey("some-long-key-to-overflow-the-multiplier");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});

describe("filterLogos", () => {
  it("returns everything for an empty query and All", () => expect(filterLogos(LIST, "", "All")).toHaveLength(4));
  it("matches title case-insensitively", () => expect(filterLogos(LIST, "NEXT", "All").map((l) => l.key)).toEqual(["nextjs"]));
  it("matches category", () => expect(filterLogos(LIST, "frame", "All").map((l) => l.key)).toEqual(["nextjs", "svelte"]));
  it("trims the query", () => expect(filterLogos(LIST, "  vercel ", "All")).toHaveLength(1));
  it("restricts to a category", () => expect(filterLogos(LIST, "", "Database").map((l) => l.key)).toEqual(["postgres"]));
  it("combines query and category", () => expect(filterLogos(LIST, "vercel", "Framework")).toEqual([]));
});

describe("categoryList", () => {
  it("counts per category, sorted by count desc, ties in data order", () => {
    expect(categoryList(LIST)).toEqual([
      { name: "Framework", count: 2 },
      { name: "Hosting", count: 1 },
      { name: "Database", count: 1 },
    ]);
  });
});

describe("sections", () => {
  const cats = categoryList(LIST);
  it("one sheet per category in list order, skipping empty ones, most used first inside", () => {
    const s = sections(filterLogos(LIST, "", "All"), cats, "category");
    expect(s.map((x) => x.title)).toEqual(["Framework", "Hosting", "Database"]);
    expect(s.map((x) => x.category)).toEqual(["Framework", "Hosting", "Database"]);
    expect(s[0].items.map((l) => l.key)).toEqual(["svelte", "nextjs"]);
    expect(sections([LIST[0]], cats, "category").map((x) => x.title)).toEqual(["Hosting"]);
  });
  it("keeps data order for equal use", () => {
    const flat = [logo("b", "B", "X"), logo("a", "A", "X")];
    expect(sections(flat, categoryList(flat), "category")[0].items.map((l) => l.key)).toEqual(["b", "a"]);
  });
  it("A–Z gives one sorted sheet", () => {
    const s = sections(LIST, cats, "az");
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ title: "All stickers, A–Z", category: null });
    expect(s[0].items.map((l) => l.title)).toEqual(["Next.js", "PostgreSQL", "Svelte", "Vercel"]);
  });
  it("Most used gives one sheet by use, ties A–Z", () => {
    const s = sections([...LIST, logo("astro", "Astro", "Framework")], cats, "used");
    expect(s).toHaveLength(1);
    expect(s[0].items.map((l) => l.key)).toEqual(["svelte", "vercel", "nextjs", "astro", "postgres"]);
  });
  it("no logos → no sheets", () => {
    for (const sort of ["category", "az", "used"] as const) expect(sections([], cats, sort)).toEqual([]);
  });
  it("sheetOrder flattens in display order", () => {
    expect(sheetOrder(sections(LIST, cats, "category")).map((l) => l.key)).toEqual(["svelte", "nextjs", "vercel", "postgres"]);
  });
});

describe("rowCapacity", () => {
  it("counts the auto-fill tracks of minmax(146px, 1fr) with 4 px gaps", () => {
    expect(rowCapacity(146)).toBe(1);
    expect(rowCapacity(295)).toBe(1);
    expect(rowCapacity(296)).toBe(2);
    // the 1120 px column: 1120 − 2 rules − 64 padding − 16 sheet padding
    expect(rowCapacity(1038)).toBe(6);
    expect(rowCapacity(1046)).toBe(7);
  });
  it("never drops below one column", () => {
    for (const w of [0, -10, 20, Number.NaN]) expect(rowCapacity(w)).toBe(1);
  });
});

describe("preview", () => {
  const items = Array.from({ length: 10 }, (_, i) => logo(`k${i}`, `K${i}`, "X"));
  it("shows a row minus one slot for the +N more tile", () => {
    const p = preview(items, 6, true, false);
    expect(p.shown.map((l) => l.key)).toEqual(["k0", "k1", "k2", "k3", "k4"]);
    expect(p.hidden).toHaveLength(5);
    expect(p).toMatchObject({ hasMore: true, expanded: false });
  });
  it("shows everything when it fits in one row", () => {
    expect(preview(items.slice(0, 6), 6, true, false)).toMatchObject({ hasMore: false, hidden: [] });
    expect(preview(items.slice(0, 6), 6, true, false).shown).toHaveLength(6);
  });
  it("expanded shows everything with a Show fewer tile", () => {
    const p = preview(items, 6, true, true);
    expect(p.shown).toHaveLength(10);
    expect(p).toMatchObject({ hasMore: true, expanded: true, hidden: [] });
  });
  it("uncapped (filtered / searched) never adds a tile", () => {
    expect(preview(items, 3, false, false)).toMatchObject({ hasMore: false });
    expect(preview(items, 3, false, false).shown).toHaveLength(10);
  });
  it("keeps at least one sticker at one column", () => {
    expect(preview(items, 1, true, false).shown).toHaveLength(1);
  });
});

describe("labels", () => {
  it("formatCount", () => {
    expect(formatCount(7)).toBe("7");
    expect(formatCount(1000)).toBe("1K");
    expect(formatCount(1234)).toBe("1.2K");
  });
  it("useLabel shows real counts, else the category", () => {
    expect(useLabel({ uses: 1, category: "Hosting" })).toBe("IN 1 DESIGN");
    expect(useLabel({ uses: 1520, category: "Hosting" })).toBe("IN 1.5K DESIGNS");
    expect(useLabel({ uses: 0, category: "Hosting" })).toBe("HOSTING");
  });
});

describe("oftenWith", () => {
  it("same category first, then the most used elsewhere, never itself", () => {
    const all = [...LIST, logo("bun", "Bun", "Runtime", 9)];
    expect(oftenWith(LIST[1], all, 3).map((l) => l.key)).toEqual(["svelte", "bun", "vercel"]);
  });
});

describe("stepKey", () => {
  const order = ["a", "b", "c"];
  it("steps and wraps", () => {
    expect(stepKey(order, "a", 1)).toBe("b");
    expect(stepKey(order, "c", 1)).toBe("a");
    expect(stepKey(order, "a", -1)).toBe("c");
  });
  it("unknown key starts at the ends; empty list → null", () => {
    expect(stepKey(order, "z", 1)).toBe("a");
    expect(stepKey(order, "z", -1)).toBe("c");
    expect(stepKey([], "a", 1)).toBeNull();
  });
});

describe("picks", () => {
  const known = (k: string) => ["vercel", "nextjs"].includes(k);
  it("parses, dedupes and drops unknown keys", () => {
    expect(parsePicks(JSON.stringify({ picked: ["vercel", "nope", "vercel", 3, "nextjs"], color: "midnight" }), known)).toEqual({
      picked: ["vercel", "nextjs"],
      color: "midnight",
    });
  });
  it("rejects garbage", () => {
    expect(parsePicks(null, known)).toBeNull();
    expect(parsePicks("{oops", known)).toBeNull();
    expect(parsePicks("42", known)).toBeNull();
    expect(parsePicks(JSON.stringify({}), known)).toEqual({ picked: [], color: "silver" });
  });
  it("togglePick adds at the end and removes", () => {
    expect(togglePick(["a"], "b")).toEqual(["a", "b"]);
    expect(togglePick(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("pageArt", () => {
  const full = { href: "/a.svg", hrefDark: "/a-d.svg", wordmark: "/w.svg", wordmarkDark: "/w-d.svg" };
  it("picks the art for logo type and theme, null when the library doesn't have it", () => {
    expect(pageArt(full, "icon", "light")).toBe("/a.svg");
    expect(pageArt(full, "icon", "dark")).toBe("/a-d.svg");
    expect(pageArt(full, "wordmark", "dark")).toBe("/w-d.svg");
    const plain = { href: "/x.svg", hrefDark: "/x.svg" };
    expect(pageArt(plain, "icon", "dark")).toBeNull();
    expect(pageArt(plain, "wordmark", "light")).toBeNull();
    expect(pageArt({ ...plain, wordmark: "/w.svg", wordmarkDark: "/w.svg" }, "wordmark", "dark")).toBeNull();
  });
});
