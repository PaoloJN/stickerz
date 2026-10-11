import { describe, it, expect } from "vitest";
import { sponsorUrl } from "@/lib/sponsor-url";

describe("sponsorUrl", () => {
  it("builds a recurring link", () => {
    expect(sponsorUrl("PaoloJN", { frequency: "recurring", amount: 5 })).toBe("https://github.com/sponsors/PaoloJN?frequency=recurring&amount=5");
  });
  it("builds a one-time link", () => {
    expect(sponsorUrl("PaoloJN", { frequency: "one-time", amount: 25 })).toBe("https://github.com/sponsors/PaoloJN?frequency=one-time&amount=25");
  });
});
