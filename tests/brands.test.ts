import { describe, expect, it } from "vitest";
import { brandRequestSchema, fieldErrors, FREE_MAIL, makeRequestId, MODES, PLANS, REQUEST_ID_ALPHABET } from "@/lib/brands";

const remove = {
  mode: "remove",
  company: "Acme Inc.",
  name: "Alex Rivera",
  email: "Alex@Acme.com",
  logos: ["vercel"],
  plan: null,
  details: null,
  authorized: true,
};

const errorsOf = (input: unknown) => {
  const r = brandRequestSchema.safeParse(input);
  return r.success ? {} : fieldErrors(r.error);
};

describe("brandRequestSchema", () => {
  it("accepts a valid removal and normalises email", () => {
    const r = brandRequestSchema.safeParse(remove);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("alex@acme.com");
      expect(r.data.plan).toBeNull();
    }
  });

  it("rejects a free-mail address for remove/update on the email field", () => {
    for (const mode of ["remove", "update"]) {
      const e = errorsOf({ ...remove, mode, email: "alex@gmail.com" });
      expect(e.email).toMatch(/company’s domain/);
    }
  });

  it("allows a free-mail address and no logos for feature", () => {
    const r = brandRequestSchema.safeParse({
      ...remove,
      mode: "feature",
      email: "alex@gmail.com",
      logos: [],
      plan: "featured",
      authorized: false,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.plan).toBe("featured");
  });

  it("allows feature with plan null (Not sure yet)", () => {
    expect(brandRequestSchema.safeParse({ ...remove, mode: "feature", plan: null, logos: [] }).success).toBe(true);
  });

  it("drops a plan sent with remove/update", () => {
    const r = brandRequestSchema.safeParse({ ...remove, plan: "partner" });
    expect(r.success && r.data.plan).toBeNull();
  });

  it("rejects unknown logo keys on the logos field", () => {
    expect(errorsOf({ ...remove, logos: ["vercel", "definitely-not-a-logo"] }).logos).toBeTruthy();
  });

  it("requires at least one logo for remove/update", () => {
    expect(errorsOf({ ...remove, logos: [] }).logos).toBe("Pick at least one logo.");
  });

  it("caps logos at 20", () => {
    expect(errorsOf({ ...remove, logos: Array(21).fill("vercel") }).logos).toBeTruthy();
  });

  it("rejects 20 kB of details", () => {
    expect(errorsOf({ ...remove, details: "x".repeat(20_000) }).details).toBeTruthy();
    expect(brandRequestSchema.safeParse({ ...remove, details: "x".repeat(2000) }).success).toBe(true);
  });

  it("turns blank details into null", () => {
    const r = brandRequestSchema.safeParse({ ...remove, details: "   " });
    expect(r.success && r.data.details).toBeNull();
  });

  it("requires the authorisation checkbox for remove/update", () => {
    expect(errorsOf({ ...remove, authorized: false }).authorized).toBe("Please confirm you can act for the brand.");
  });

  it("reports every field of an empty removal at once, with the design's messages", () => {
    const e = errorsOf({ ...remove, company: " ", name: "", email: "", logos: [], authorized: false });
    expect(e).toEqual({
      company: "Add the company or brand name.",
      name: "Add your name.",
      email: "Enter a valid email address.",
      logos: "Pick at least one logo.",
      authorized: "Please confirm you can act for the brand.",
    });
  });

  it("rejects an invalid email and an unknown mode", () => {
    expect(errorsOf({ ...remove, email: "nope" }).email).toBe("Enter a valid email address.");
    expect(errorsOf({ ...remove, mode: "delete" }).mode).toBeTruthy();
  });

  it("treats missing logos as none (feature passes, remove asks for one)", () => {
    const { logos: _omit, ...noLogos } = remove;
    expect(brandRequestSchema.safeParse({ ...noLogos, mode: "feature" }).success).toBe(true);
    expect(errorsOf(noLogos).logos).toBe("Pick at least one logo.");
  });

  it("explains an unknown plan in words", () => {
    expect(errorsOf({ ...remove, mode: "feature", logos: [], plan: "gold" }).plan).toBe("Pick a plan or choose Not sure yet.");
  });

  it("rejects non-object bodies", () => {
    expect(brandRequestSchema.safeParse(null).success).toBe(false);
    expect(brandRequestSchema.safeParse("hi").success).toBe(false);
  });
});

describe("makeRequestId", () => {
  it("is BR- plus 6 chars from the unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const id = makeRequestId();
      expect(id).toMatch(/^BR-[ABCDEFGHJKMNPQRSTVWXYZ23456789]{6}$/);
    }
    expect(REQUEST_ID_ALPHABET).toBe("ABCDEFGHJKMNPQRSTVWXYZ23456789");
  });

  it("varies", () => {
    expect(new Set(Array.from({ length: 50 }, makeRequestId)).size).toBeGreaterThan(45);
  });
});

describe("copy tables", () => {
  it("has three modes, three plans and the free-mail list", () => {
    expect(Object.keys(MODES)).toEqual(["remove", "update", "feature"]);
    expect(Object.keys(PLANS)).toEqual(["verified", "featured", "partner"]);
    expect(FREE_MAIL).toContain("gmail.com");
  });

  it("promises no email we don't send (no confirmation links, no 'we email you')", () => {
    const copy = JSON.stringify(MODES);
    expect(copy).not.toMatch(/confirm your email|a link goes|email you|of confirming/i);
  });
});
