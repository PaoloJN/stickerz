import { expect, test } from "vitest";
import { History } from "@/lib/stickers/history";

test("undo/redo walk and redo cleared by push", () => {
  const h = new History<number>();
  h.push(1); h.push(2);            // states before edits; current = 3
  expect(h.undo(3)).toBe(2);
  expect(h.undo(2)).toBe(1);
  expect(h.undo(1)).toBeNull();
  expect(h.redo(1)).toBe(2);
  h.push(2);
  expect(h.canRedo).toBe(false);
});

test("limit drops oldest", () => {
  const h = new History<number>(2);
  h.push(1); h.push(2); h.push(3);
  expect(h.undo(4)).toBe(3);
  expect(h.undo(3)).toBe(2);
  expect(h.undo(2)).toBeNull();
});
