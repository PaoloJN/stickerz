import { describe, expect, it } from "vitest";
import { filterDesigns, sortDesigns } from "../src/lib/designs-page";

const list = [
  { name: "Zed", count: 2 },
  { name: "alpha", count: 9 },
  { name: "Beta stack", count: 5 },
];

describe("designs page helpers", () => {
  it("filters case-insensitively by substring", () => {
    expect(filterDesigns(list, "ALP").map((d) => d.name)).toEqual(["alpha"]);
    expect(filterDesigns(list, "  ")).toEqual(list);
    expect(filterDesigns(list, "nope")).toEqual([]);
  });
  it("sorts without mutating", () => {
    expect(sortDesigns(list, "edited")).toEqual(list);
    expect(sortDesigns(list, "name").map((d) => d.name)).toEqual(["alpha", "Beta stack", "Zed"]);
    expect(sortDesigns(list, "stickers").map((d) => d.count)).toEqual([9, 5, 2]);
    expect(list[0].name).toBe("Zed");
  });
});
