import { expect, test } from "vitest";
import { renamedPath } from "../../src/hooks.server";

test("old URLs map to their renamed pages", () => {
  expect(renamedPath("/logos")).toBe("/stickers");
  expect(renamedPath("/gallery/")).toBe("/community");
  expect(renamedPath("/stacks")).toBe("/designs");
  expect(renamedPath("/stack/abc123")).toBe("/designs/abc123");
  expect(renamedPath("/directory/ai")).toBe("/stickers?category=ai");
  expect(renamedPath("/favorites")).toBe("/stickers");
  expect(renamedPath("/directory")).toBe("/stickers");
  for (const keep of ["/", "/stickers", "/designs/abc", "/archived/logos", "/editor", "/logos-x", "/stack"]) expect(renamedPath(keep)).toBeNull();
});
