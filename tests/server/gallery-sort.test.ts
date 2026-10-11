import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/db", () => ({ db: null }));
const { sortGallery, trendingScore, listGallery } = await import("@/lib/server/stacks");

const NOW = Date.UTC(2026, 9, 10);
const DAY = 86_400_000;
const r = (id: string, ageDays: number, remixCount: number) => ({ id, createdAt: new Date(NOW - ageDays * DAY), remixCount });

// old & heavily remixed, brand new & barely remixed, a week old & moderately remixed
const rows = [r("old-hit", 60, 500), r("fresh", 0, 1), r("week", 7, 60), r("fresh-tie", 0, 1)];
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe("sortGallery", () => {
  it("newest = createdAt desc", () => {
    expect(ids(sortGallery(rows, "newest", NOW))).toEqual(["fresh", "fresh-tie", "week", "old-hit"]);
  });
  it("most-remixed = remixCount desc, then newest", () => {
    const tie = [r("a", 5, 3), r("b", 1, 3), r("c", 0, 9)];
    expect(ids(sortGallery(tie, "most-remixed", NOW))).toEqual(["c", "b", "a"]);
  });
  it("trending weighs remixes by age", () => {
    expect(ids(sortGallery(rows, "trending", NOW))).toEqual(["week", "old-hit", "fresh", "fresh-tie"]);
  });
  it("the three sorts differ", () => {
    const orders = (["newest", "most-remixed", "trending"] as const).map((s) => ids(sortGallery(rows, s, NOW)).join());
    expect(new Set(orders).size).toBe(3);
  });
  it("does not mutate its input", () => {
    const copy = [...rows];
    sortGallery(rows, "newest", NOW);
    expect(rows).toEqual(copy);
  });
  it("trendingScore decays with age", () => {
    expect(trendingScore(r("x", 0, 10), NOW)).toBeGreaterThan(trendingScore(r("y", 10, 10), NOW));
  });
});

describe("listGallery mock fallback", () => {
  it("lists only public mock designs", async () => {
    const list = await listGallery("newest");
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((s) => s.vis === "Public")).toBe(true);
  });
});
