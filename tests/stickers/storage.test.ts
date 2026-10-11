import { expect, test } from "vitest";
import { LAYOUT_KEY, loadLayout, saveLayout } from "@/lib/stickers/storage";
import { emptyLayout } from "@/lib/stickers/laptops";

test("save then load", () => {
  const m = new Map<string, string>();
  const st = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  saveLayout(st, emptyLayout());
  expect(m.has(LAYOUT_KEY)).toBe(true);
  expect(loadLayout(st)).toEqual(emptyLayout());
});

test("throwing, null, corrupt storage are safe", () => {
  const boom = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } };
  expect(loadLayout(boom)).toBeNull();
  expect(() => saveLayout(boom, emptyLayout())).not.toThrow();
  expect(loadLayout(null)).toBeNull();
  expect(loadLayout({ getItem: () => "{bad" })).toBeNull();
});
