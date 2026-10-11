import { describe, it, expect } from "vitest";
import { formatCount } from "@/lib/format";

describe("formatCount", () => {
  it("keeps small numbers as is", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(999)).toBe("999");
  });
  it("uses one decimal k for thousands", () => {
    expect(formatCount(4821)).toBe("4.8k");
    expect(formatCount(12600)).toBe("12.6k");
  });
  it("drops a trailing .0", () => expect(formatCount(3000)).toBe("3k"));
  it("uses m for millions", () => expect(formatCount(1_200_000)).toBe("1.2m"));
});
