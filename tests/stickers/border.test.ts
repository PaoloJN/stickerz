import { expect, test } from "vitest";
import { DEFAULT_STYLE, resolveBorder, TONE } from "@/lib/stickers/style";

test("new stickers default to the traced cut and a border that contrasts the device", () => {
  expect(DEFAULT_STYLE.contour).toBe("smooth");
  expect(DEFAULT_STYLE.borderColor).toBe("device");
  const s = { ...DEFAULT_STYLE, theme: "dark" as const };
  expect(resolveBorder(s, true)).toBe(TONE.light);
  expect(resolveBorder(s, false)).toBe(TONE.dark);
  // holographic die-cut keeps its holo edge
  expect(resolveBorder({ ...s, finish: "holo" }, true)).toBeNull();
});
