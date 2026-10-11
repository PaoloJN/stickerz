import { beforeEach, describe, expect, it, vi } from "vitest";
import { isHttpError } from "@sveltejs/kit";

const env = vi.hoisted(() => ({ dev: false }));
vi.mock("$app/environment", () => ({
  get dev() {
    return env.dev;
  },
}));
// no DATABASE_URL: the db client is null
vi.mock("@/lib/server/db", () => ({ db: null, dbConfigured: false }));
const issue = vi.hoisted(() => ({ open: vi.fn(() => new Promise(() => {})) }));
vi.mock("@/lib/server/github-issues", () => ({ openBrandRequestIssue: issue.open }));

const { createBrandRequest } = await import("@/lib/server/brand-requests");
const { POST } = await import("../../src/routes/api/brand-requests/+server");

const input = {
  mode: "feature" as const,
  company: "Acme",
  name: "Ada",
  email: "ada@acme.dev",
  logos: [],
  plan: null,
  details: null,
  authorized: false,
};

describe("createBrandRequest without a database", () => {
  beforeEach(() => vi.spyOn(console, "warn").mockImplementation(() => {}));

  it("refuses with 503 in production instead of handing out a fake id", async () => {
    env.dev = false;
    const e = await createBrandRequest(input).catch((x) => x);
    expect(isHttpError(e)).toBe(true);
    expect(e.status).toBe(503);
  });

  it("still returns a mock id in dev", async () => {
    env.dev = true;
    expect((await createBrandRequest(input)).id).toMatch(/^BR-[A-Z0-9]{6}$/);
  });

  it("opens a GitHub issue in dev mock mode without waiting on it, and never passes the email", async () => {
    env.dev = true;
    issue.open.mockClear();
    // the mocked notifier never settles: createBrandRequest must still resolve
    const { id } = await createBrandRequest(input);
    expect(issue.open).toHaveBeenCalledTimes(1);
    const [arg] = issue.open.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(arg).toEqual({ id, mode: "feature", company: "Acme", name: "Ada", logos: [], plan: null, details: null });
    expect(JSON.stringify(arg)).not.toContain("ada@acme.dev");
  });

  it("POST answers 503 { error } in production so the form can show it", async () => {
    env.dev = false;
    const request = new Request("http://x/api/brand-requests", { method: "POST", body: JSON.stringify(input) });
    const res = await (POST as unknown as (e: { request: Request; getClientAddress: () => string }) => Promise<Response>)({ request, getClientAddress: () => "1.2.3.4" });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Requests are temporarily unavailable. Please try again later." });
  });
});
