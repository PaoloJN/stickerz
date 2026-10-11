import { describe, expect, it } from "vitest";
import { createEditor } from "../../src/lib/stickers/editor.svelte";
import { emptyLayout } from "../../src/lib/stickers/laptops";
import * as ops from "../../src/lib/stickers/ops";
import { DEFAULT_STYLE } from "../../src/lib/stickers/style";
import type { Layout } from "../../src/lib/stickers/types";

const mk = () => createEditor(undefined, { storage: null });
const ids = (e: ReturnType<typeof mk>) => e.layout.stickers.map((s) => s.id);

describe("EditorState history", () => {
  it("add -> undo removes -> redo restores", () => {
    const e = mk();
    const s = e.addSticker("vercel");
    expect(ids(e)).toEqual([s.id]);
    expect(e.canUndo).toBe(true);
    e.undo();
    expect(ids(e)).toEqual([]);
    expect(e.canRedo).toBe(true);
    e.redo();
    expect(ids(e)).toEqual([s.id]);
  });

  it("a gesture of 5 updates is one undo step", () => {
    const e = mk();
    const s = e.addSticker("vercel", { x: 10, y: 10 });
    e.beginGesture();
    for (let i = 1; i <= 5; i++) e.update(s.id, { x: 10 + i });
    e.endGesture();
    expect(e.layout.stickers[0].x).toBe(15);
    e.undo();
    expect(e.layout.stickers[0].x).toBe(10);
    e.undo();
    expect(ids(e)).toEqual([]);
  });

  it("duplicate offsets +5mm with a new id", () => {
    const e = mk();
    const s = e.addSticker("vercel", { x: 20, y: 30 });
    const d = e.duplicate(s.id)!;
    expect(d.id).not.toBe(s.id);
    expect([d.x, d.y]).toEqual([25, 35]);
    expect(e.layout.stickers).toHaveLength(2);
  });

  it("remove clears selection when removing the selected sticker", () => {
    const e = mk();
    const a = e.addSticker("vercel");
    const b = e.addSticker("vercel");
    e.select(a.id);
    e.remove(b.id);
    expect(e.selectedId).toBe(a.id);
    e.remove(a.id);
    expect(e.selectedId).toBeNull();
  });

  it("z-order methods reorder and no-op at the ends", () => {
    const e = mk();
    const [a, b, c] = [e.addSticker("vercel"), e.addSticker("vercel"), e.addSticker("vercel")];
    e.bringForward(a.id);
    expect(ids(e)).toEqual([b.id, a.id, c.id]);
    e.toFront(b.id);
    expect(ids(e)).toEqual([a.id, c.id, b.id]);
    e.toBack(b.id);
    expect(ids(e)).toEqual([b.id, a.id, c.id]);
    e.sendBackward(c.id);
    expect(ids(e)).toEqual([b.id, c.id, a.id]);
    const before = e.layout;
    e.toBack(b.id);
    e.sendBackward(b.id);
    e.toFront(a.id);
    e.bringForward(a.id);
    expect(ids(e)).toEqual([b.id, c.id, a.id]);
    expect(e.layout).toStrictEqual(before);
    e.undo(); // no-ops recorded nothing: this undoes the sendBackward above
    expect(ids(e)).toEqual([b.id, a.id, c.id]);
  });
});

describe("ops (pure)", () => {
  const L = (...n: string[]): Layout => ({ ...emptyLayout(), stickers: n.map((id) => ({ id, logo: "vercel", variant: "icon", theme: "light", locked: false, ...DEFAULT_STYLE, x: 0, y: 0, w: 50, rot: 0 })) });
  const order = (l: Layout) => l.stickers.map((s) => s.id).join("");
  it("shuffle keeps locked stickers and places the rest on the lid", () => {
    const l = L("a", "b", "c", "d");
    l.stickers[1] = { ...l.stickers[1], locked: true, x: 7, y: 8, rot: 3 };
    const out = ops.shuffle(l, { w: 300, h: 200 });
    expect(out.stickers[1]).toBe(l.stickers[1]);
    for (const s of out.stickers) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(300);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(200);
      expect(Math.abs(s.rot)).toBeLessThanOrEqual(18);
    }
    expect(ops.shuffle(L(), { w: 1, h: 1 })).toStrictEqual(L());
  });
  it("rescale keeps relative positions", () => {
    const l = { ...L("a"), stickers: [{ ...L("a").stickers[0], x: 150, y: 100 }] };
    const out = ops.rescale(l, { w: 300, h: 200 }, { w: 150, h: 400 });
    expect([out.stickers[0].x, out.stickers[0].y]).toEqual([75, 200]);
    expect(ops.rescale(l, { w: 3, h: 2 }, { w: 3, h: 2 })).toBe(l);
  });
  it("reorders and returns same object at the ends", () => {
    const l = L("a", "b", "c");
    expect(order(ops.toFront(l, "a"))).toBe("bca");
    expect(order(ops.toBack(l, "c"))).toBe("cab");
    expect(ops.toFront(l, "c")).toBe(l);
    expect(ops.sendBackward(l, "a")).toBe(l);
    expect(ops.bringForward(l, "zzz")).toBe(l);
  });
});

describe("no-op handling", () => {
  it("update with an unchanged patch records nothing", () => {
    const e = createEditor();
    const s = e.addSticker("x");
    const before = e.canUndo;
    e.undo();
    e.redo();
    e.update(s.id, { x: s.x });
    e.update(s.id, { w: s.w });
    e.undo();
    expect(e.layout.stickers.length).toBe(0); // only the add was undone
    expect(before).toBe(true);
  });
  it("a gesture with no change records no history entry", () => {
    const e = createEditor();
    const s = e.addSticker("x");
    e.undo();
    e.redo();
    e.beginGesture();
    e.update(s.id, { x: s.x });
    e.endGesture();
    e.undo();
    expect(e.layout.stickers.length).toBe(0);
  });
  it("a gesture with changes is one entry", () => {
    const e = createEditor();
    const s = e.addSticker("x");
    e.beginGesture();
    e.update(s.id, { x: 1 });
    e.update(s.id, { x: 2 });
    e.endGesture();
    e.undo();
    expect(e.layout.stickers[0].x).toBe(s.x);
  });
  it("aspects are keyed independently per href", () => {
    const e = createEditor();
    e.aspects["a.svg"] = 2;
    e.aspects["b.svg"] = 0.5;
    expect(e.aspects["a.svg"]).toBe(2);
    expect(e.aspects["b.svg"]).toBe(0.5);
  });
});

describe("styles", () => {
  it("copy style to all applies style keys only, as one undo step", () => {
    const e = mk();
    const a = e.addSticker("vercel", { x: 10, y: 10 });
    const b = e.addSticker("vercel", { x: 50, y: 50 });
    e.update(a.id, { shape: "hex", fill: "#ff6a3d", finish: "gloss", lift: 90 });
    e.applyStyleToAll(a.id);
    const nb = e.layout.stickers.find((s) => s.id === b.id)!;
    expect(nb).toMatchObject({ shape: "hex", fill: "#ff6a3d", finish: "gloss", lift: 90, x: 50, y: 50 });
    e.undo();
    expect(e.layout.stickers.find((s) => s.id === b.id)).toMatchObject(DEFAULT_STYLE);
  });
  it("updateAll patches every sticker as one undo step, and no-ops when nothing changes", () => {
    const e = mk();
    e.addSticker("vercel");
    e.addSticker("vercel");
    e.updateAll({ rot: 0, theme: "light" });
    expect(e.layout.stickers.every((s) => s.rot === 0 && s.theme === "light")).toBe(true);
    const before = e.layout;
    e.updateAll({ rot: 0 });
    expect(e.layout).toBe(before);
    e.undo();
    expect(e.layout.stickers).toHaveLength(2);
    expect(e.layout.stickers.some((s) => s.theme !== "light" || s.rot !== 0)).toBe(true);
  });
  it("reset restores the default style", () => {
    const e = mk();
    const a = e.addSticker("vercel");
    e.update(a.id, { shape: "circle", border: false });
    e.resetStyle(a.id);
    expect(e.layout.stickers[0]).toMatchObject(DEFAULT_STYLE);
  });
  it("changing the device rescales sticker positions", () => {
    const e = mk();
    e.setLaptop({ model: "air13" });
    const a = e.addSticker("vercel", { x: 152.05, y: 107.5 });
    e.setLaptop({ model: "pro16" });
    const moved = e.layout.stickers.find((s) => s.id === a.id)!;
    expect(moved.x).toBeCloseTo(355.7 / 2);
    expect(moved.y).toBeCloseTo(248.1 / 2);
  });
  it("switching device keeps the color when offered, else picks the device's first finish", () => {
    const e = mk();
    e.setLaptop({ model: "air13", color: "midnight" });
    expect(e.layout.laptop).toEqual({ model: "air13", color: "midnight" });
    e.setLaptop({ model: "air15" });
    expect(e.layout.laptop.color).toBe("midnight");
    e.setLaptop({ model: "pro14" });
    expect(e.layout.laptop.color).toBe("space-black");
  });
});

describe("multi-selection", () => {
  const three = () => {
    const e = mk();
    const ids = [e.addSticker("vercel", { x: 10, y: 10 }), e.addSticker("vercel", { x: 50, y: 50 }), e.addSticker("vercel", { x: 90, y: 30 })].map((s) => s.id);
    return { e, ids };
  };
  it("one id is a single selection, two or more a multi-selection", () => {
    const { e, ids } = three();
    e.setSelection([ids[0]]);
    expect([e.selectedId, e.selectedIds]).toEqual([ids[0], []]);
    e.toggleSelected(ids[1]);
    expect([e.selectedId, e.selectedIds]).toEqual([null, [ids[0], ids[1]]]);
    e.toggleSelected(ids[0]);
    expect([e.selectedId, e.selectedIds]).toEqual([ids[1], []]);
    e.selectAll();
    expect(e.selection).toEqual(ids);
    e.select(null);
    expect(e.selection).toEqual([]);
  });
  it("removeMany, duplicateMany and moveBy act on the set as single undo steps", () => {
    const { e, ids } = three();
    e.update(ids[2], { locked: true });
    e.moveBy(ids, 5, 0);
    expect(e.layout.stickers.map((s) => s.x)).toEqual([15, 55, 90]);
    e.undo();
    expect(e.layout.stickers.map((s) => s.x)).toEqual([10, 50, 90]);
    e.duplicateMany([ids[0], ids[1]]);
    expect(e.layout.stickers).toHaveLength(5);
    expect(e.selectedIds).toHaveLength(2);
    e.removeMany(e.selectedIds);
    expect(e.layout.stickers).toHaveLength(3);
    expect(e.selection).toEqual([]);
  });
  it("align and distribute move the selection", () => {
    const { e, ids } = three();
    e.updateMany(ids, { rot: 0 });
    e.setSelection(ids);
    e.align("top");
    const ys = e.layout.stickers.map((s) => s.y);
    expect(new Set(ys).size).toBe(1);
    e.updateMany([ids[1]], { x: 80 });
    expect(e.distribute("x")).toBe(true);
    expect(e.layout.stickers.map((s) => s.x)).toEqual([10, 50, 90]);
  });
  it("addMany adds a pack in one step", () => {
    const e = mk();
    e.addMany(["vercel", "supabase", "bun"]);
    expect(e.layout.stickers.map((s) => s.logo)).toEqual(["vercel", "supabase", "bun"]);
    e.undo();
    expect(e.layout.stickers).toHaveLength(0);
  });
});
