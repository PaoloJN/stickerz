import { expect, test } from "vitest";
import { isOfficial, sponsoredLogos, SPONSORED_SLOTS, type BrandSponsor } from "@/lib/stickers/sponsors";

test("sponsored row: partners first, verified-only excluded, capped", () => {
  const list: BrandSponsor[] = [
    { logo: "a", tier: "featured" },
    { logo: "b", tier: "verified" },
    { logo: "c", tier: "partner" },
    ...Array.from({ length: 10 }, (_, i) => ({ logo: `f${i}`, tier: "featured" as const })),
  ];
  const row = sponsoredLogos(list);
  expect(row[0]).toBe("c");
  expect(row).not.toContain("b");
  expect(row).toHaveLength(SPONSORED_SLOTS);
  expect(isOfficial("b", list)).toBe(true);
  expect(isOfficial("zzz", list)).toBe(false);
});
