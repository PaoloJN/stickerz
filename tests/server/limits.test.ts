import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const state = { rows: [] as { createdAt: Date }[][], enabled: true };
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

const { brandRequestLimit, createDesignLimit } = await import("@/lib/server/limits");
const { clientIp } = await import("@/lib/server/ip");

const ago = (ms: number) => ({ createdAt: new Date(Date.now() - ms) });
const MIN = 60_000;

beforeEach(() => {
  h.state.rows = [];
  h.state.enabled = true;
});

describe("brandRequestLimit", () => {
  it("is ok under both limits", async () => {
    h.state.rows = [[ago(MIN), ago(2 * MIN)], [ago(MIN)]];
    expect(await brandRequestLimit("1.1.1.1", "a@b.co")).toEqual({ ok: true });
  });
  it("blocks the 4th request per email and reports when the oldest ages out", async () => {
    h.state.rows = [[ago(MIN), ago(2 * MIN), ago(60 * MIN)], []];
    const r = await brandRequestLimit("1.1.1.1", "a@b.co");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Math.abs(r.retryAfterSec - 23 * 3600)).toBeLessThan(5);
  });
  it("blocks the 11th request per IP within the hour", async () => {
    h.state.rows = [[], Array.from({ length: 10 }, (_, i) => ago((i + 1) * MIN))];
    const r = await brandRequestLimit("1.1.1.1", "a@b.co");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Math.abs(r.retryAfterSec - 50 * 60)).toBeLessThan(5);
  });
  it("is ok with no database", async () => {
    h.state.enabled = false;
    expect(await brandRequestLimit("1.1.1.1", "a@b.co")).toEqual({ ok: true });
  });
});

describe("createDesignLimit", () => {
  it("is ok under 60", async () => {
    h.state.rows = [Array.from({ length: 59 }, () => ago(MIN))];
    expect(await createDesignLimit("o")).toEqual({ ok: true });
  });
  it("blocks at 60", async () => {
    h.state.rows = [Array.from({ length: 60 }, (_, i) => ago((i + 1) * MIN * 0.5))];
    const r = await createDesignLimit("o");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retryAfterSec).toBeGreaterThan(0);
  });
  it("is ok with no database", async () => {
    h.state.enabled = false;
    expect(await createDesignLimit("o")).toEqual({ ok: true });
  });
});

describe("clientIp", () => {
  const ev = (xff?: string) => ({
    request: new Request("http://x", { headers: xff ? { "x-forwarded-for": xff } : {} }),
    getClientAddress: () => "9.9.9.9",
  });
  it("picks the first forwarded address, trimmed", () => expect(clientIp(ev("  1.2.3.4 , 5.6.7.8"))).toBe("1.2.3.4"));
  it("falls back to getClientAddress", () => expect(clientIp(ev())).toBe("9.9.9.9"));
});
