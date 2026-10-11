import { describe, it, expect } from "vitest";
import { slugify, makeId, handleFor, assertOwner, OwnershipError } from "@/lib/server/ids";

describe("slugify", () => {
  it("lowercases and dashes", () => expect(slugify("My Stack 2026!")).toBe("my-stack-2026"));
  it("collapses and trims dashes", () => expect(slugify("  a  b  ")).toBe("a-b"));
  it("falls back for empty", () => expect(slugify("")).toBe("stack"));
});

describe("makeId", () => {
  it("adds a suffix so repeats differ", () => {
    const a = makeId("My stack");
    const b = makeId("My stack");
    expect(a).not.toBe(b);
    expect(a.startsWith("my-stack-")).toBe(true);
  });
});

describe("handleFor", () => {
  it("is deterministic", () => expect(handleFor("abc")).toBe(handleFor("abc")));
  it("looks like adjective-noun", () => expect(handleFor("abc")).toMatch(/^[a-z]+-[a-z]+$/));
  it("never yields undefined parts for many random ids", () => {
    for (let i = 0; i < 500; i++) {
      const h = handleFor(crypto.randomUUID());
      expect(h).toMatch(/^[a-z]+-[a-z]+$/);
      expect(h).not.toContain("undefined");
    }
  });
});

describe("assertOwner", () => {
  it("passes for the owner", () => expect(() => assertOwner({ ownerId: "x" }, "x")).not.toThrow());
  it("throws for a stranger", () => expect(() => assertOwner({ ownerId: "x" }, "y")).toThrow(OwnershipError));
});
