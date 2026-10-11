import { describe, it, expect } from "vitest";
import { decorativeHrefs, pickTeaser } from "@/lib/home";

describe("pickTeaser", () => {
  const mock = ["m1", "m2", "m3", "m4", "m5"];
  it("uses the real stacks when there are any", () => {
    expect(pickTeaser(["a", "b", "c", "d", "e", "f"], mock)).toEqual(["a", "b", "c", "d"]);
  });
  it("keeps a short real list as is (no padding with mocks)", () => {
    expect(pickTeaser(["a", "b"], mock)).toEqual(["a", "b"]);
  });
  it("falls back to the mocks when the gallery is empty", () => {
    expect(pickTeaser([], mock)).toEqual(["m1", "m2", "m3", "m4"]);
  });
  it("honours n", () => expect(pickTeaser([], mock, 2)).toEqual(["m1", "m2"]));
});

describe("decorativeHrefs", () => {
  it("maps files to unique /library hrefs", () => {
    const h = decorativeHrefs();
    expect(h).toContain("/library/react_light.svg");
    expect(h.every((x) => x.startsWith("/library/") && x.endsWith(".svg"))).toBe(true);
    expect(new Set(h).size).toBe(h.length);
  });
});
