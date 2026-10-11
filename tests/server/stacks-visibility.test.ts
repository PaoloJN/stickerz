import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const state = { rows: [] as unknown[][], enabled: true };
  const chain = () => {
    const c: Record<string, unknown> = {};
    for (const k of ["from", "where", "orderBy"]) c[k] = () => c;
    c.limit = () => Promise.resolve(state.rows.shift() ?? []);
    return c;
  };
  return { state, db: { select: () => chain() } };
});
vi.mock("@/lib/server/db", () => ({
  get db() {
    return h.state.enabled ? h.db : null;
  },
}));

const { getStack, canView } = await import("@/lib/server/stacks");

const row = (visibility: "public" | "unlisted" | "private", ownerId = "owner-1") => ({
  id: "my-design-abc123",
  name: "My design",
  author: "brave-otter",
  ownerId,
  model: "air13",
  color: "silver",
  layout: { laptop: { model: "air13", color: "silver" }, stickers: [] },
  visibility,
  stickerCount: 0,
  remixCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

beforeEach(() => {
  h.state.rows = [];
  h.state.enabled = true;
});

describe("getStack visibility", () => {
  it("private + owner -> row", async () => {
    h.state.rows = [[row("private")]];
    expect((await getStack("my-design-abc123", "owner-1"))?.id).toBe("my-design-abc123");
  });
  it("private + stranger -> null", async () => {
    h.state.rows = [[row("private")]];
    expect(await getStack("my-design-abc123", "someone-else")).toBeNull();
  });
  it("private + no viewer -> null", async () => {
    h.state.rows = [[row("private")]];
    expect(await getStack("my-design-abc123")).toBeNull();
  });
  it("unlisted + stranger -> row", async () => {
    h.state.rows = [[row("unlisted")]];
    expect((await getStack("my-design-abc123", "someone-else"))?.vis).toBe("Unlisted");
  });
  it("public -> row", async () => {
    h.state.rows = [[row("public")]];
    expect((await getStack("my-design-abc123"))?.vis).toBe("Public");
  });
  it("missing -> null", async () => {
    h.state.rows = [[]];
    expect(await getStack("nope", "owner-1")).toBeNull();
  });
  it("mock fallback hides private mock designs", async () => {
    h.state.enabled = false;
    expect(await getStack("ai-tinkering")).toBeNull();
    expect((await getStack("backend-kit"))?.id).toBe("backend-kit");
  });
});

describe("canView", () => {
  it("never matches an empty owner id", () => {
    expect(canView({ visibility: "private", ownerId: "" }, "")).toBe(false);
  });
});
