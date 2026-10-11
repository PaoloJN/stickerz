import { describe, expect, it } from "vitest";
import { keyToAction } from "../../src/components/editor/shortcuts";

const k = (key: string, o: Partial<{ metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }> = {}) =>
  keyToAction({ key, metaKey: false, ctrlKey: false, shiftKey: false, ...o });

describe("keyToAction", () => {
  it("undo/redo", () => {
    expect(k("z", { metaKey: true })).toEqual({ type: "undo" });
    expect(k("Z", { metaKey: true, shiftKey: true })).toEqual({ type: "redo" });
    expect(k("y", { ctrlKey: true })).toEqual({ type: "redo" });
  });
  it("duplicate/delete/escape", () => {
    expect(k("d", { metaKey: true })).toEqual({ type: "duplicate" });
    expect(k("Backspace")).toEqual({ type: "delete" });
    expect(k("Delete")).toEqual({ type: "delete" });
    expect(k("Escape")).toEqual({ type: "deselect" });
  });
  it("nudge 1mm, shift 10mm", () => {
    expect(k("ArrowLeft")).toEqual({ type: "nudge", dx: -1, dy: 0 });
    expect(k("ArrowDown", { shiftKey: true })).toEqual({ type: "nudge", dx: 0, dy: 10 });
  });
  it("z-order", () => {
    expect(k("[")).toEqual({ type: "backward" });
    expect(k("]")).toEqual({ type: "forward" });
    expect(k("[", { metaKey: true })).toEqual({ type: "toBack" });
    expect(k("]", { metaKey: true })).toEqual({ type: "toFront" });
  });
  it("shift+brackets jump to the ends", () => {
    expect(k("{", { shiftKey: true })).toEqual({ type: "toBack" });
    expect(k("}", { shiftKey: true })).toEqual({ type: "toFront" });
  });
  it("select all", () => {
    expect(k("a", { metaKey: true })).toEqual({ type: "selectAll" });
  });
  it("shuffle and lock", () => {
    expect(k("s")).toEqual({ type: "shuffle" });
    expect(k("L")).toEqual({ type: "lock" });
    expect(k("s", { metaKey: true })).toBeNull();
  });
  it("ignores others", () => {
    expect(k("a")).toBeNull();
    expect(k("c", { metaKey: true })).toBeNull();
  });
});
