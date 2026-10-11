import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({}) as Record<string, string | undefined>);
vi.mock("$env/dynamic/private", () => ({ env }));

const { brandIssueBody, openBrandRequestIssue, _resetIssueWarning } = await import("@/lib/server/github-issues");
const { LOGO_BY_KEY } = await import("@/lib/stickers/logos");
type Input = Parameters<typeof brandIssueBody>[0];

const feature: Input = {
  id: "BR-ABC123",
  mode: "feature",
  company: "Acme",
  name: "Ada Lovelace",
  logos: [],
  plan: "featured",
  details: "Launch in March.\nSecond line.",
};
const remove: Input = { ...feature, id: "BR-RM0001", mode: "remove", plan: null, logos: ["vercel", "github"], details: null };

const created = () =>
  vi.fn(async () => new Response(JSON.stringify({ html_url: "https://github.com/o/r/issues/7" }), { status: 201 })) as unknown as typeof fetch;

describe("brandIssueBody", () => {
  it("feature request with a plan", () => {
    const { title, body, labels } = brandIssueBody(feature);
    expect(title).toBe("[feature] Acme · BR-ABC123");
    expect(labels).toEqual(["brand-request", "brand:feature"]);
    expect(body).toContain("| Request | feature |");
    expect(body).toContain("| Company | Acme |");
    expect(body).toContain("| Requester | Ada Lovelace |");
    expect(body).toContain("| Plan | featured |");
    expect(body).toContain("| Reference | `BR-ABC123` |");
    expect(body).toContain("> Launch in March.\n> Second line.");
    expect(body).toContain(
      "No email in this issue on purpose. The requester's address is on row BR-ABC123 in the brand_requests table (pnpm db:studio).",
    );
  });

  it("remove request lists both logos by title with their keys", () => {
    const { title, labels, body } = brandIssueBody(remove);
    expect(title).toBe("[remove] Acme · BR-RM0001");
    expect(labels).toEqual(["brand-request", "brand:remove"]);
    const v = LOGO_BY_KEY.get("vercel")!.title;
    const g = LOGO_BY_KEY.get("github")!.title;
    expect(body).toContain(`| Logos | ${v} (\`vercel\`), ${g} (\`github\`) |`);
    expect(body).toContain("| Plan | — |");
  });

  it("falls back to the key for an unknown logo", () => {
    expect(brandIssueBody({ ...remove, logos: ["nope-xyz"] }).body).toContain("| Logos | `nope-xyz` |");
  });

  it("never puts the email in the issue, even when the caller passes it", () => {
    const withEmail = { ...feature, email: "ada@acme.dev" } as Input;
    const out = brandIssueBody(withEmail);
    expect(JSON.stringify(out)).not.toContain("ada@acme.dev");
  });

  it("escapes pipes so a company name can't break the table", () => {
    expect(brandIssueBody({ ...feature, company: "A|B" }).body).toContain("| Company | A\\|B |");
  });
});

describe("openBrandRequestIssue", () => {
  beforeEach(() => {
    delete env.GITHUB_TOKEN;
    delete env.GITHUB_ISSUES_REPO;
    _resetIssueWarning();
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns null without a token, never calls fetch, and warns once per process", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const f = created();
    expect(await openBrandRequestIssue(feature, { fetchFn: f })).toBeNull();
    expect(await openBrandRequestIssue(remove, { fetchFn: f })).toBeNull();
    expect(f).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("[brand-requests] GITHUB_TOKEN unset; no issue opened for", "BR-ABC123");
  });

  it("POSTs to the repo's issues endpoint with the right headers and JSON", async () => {
    env.GITHUB_TOKEN = "ghp_env";
    const f = created();
    expect(await openBrandRequestIssue(feature, { fetchFn: f })).toEqual({ url: "https://github.com/o/r/issues/7" });
    const [url, init] = vi.mocked(f).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/PaoloJN/stickerz/issues");
    expect(init.method).toBe("POST");
    const h = new Headers(init.headers);
    expect(h.get("authorization")).toBe("Bearer ghp_env");
    expect(h.get("accept")).toBe("application/vnd.github+json");
    expect(h.get("x-github-api-version")).toBe("2022-11-28");
    expect(h.get("user-agent")).toBe("stickerz");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init.body as string)).toEqual(brandIssueBody(feature));
  });

  it("targets GITHUB_ISSUES_REPO when set", async () => {
    env.GITHUB_TOKEN = "t";
    env.GITHUB_ISSUES_REPO = "acme/brand-inbox";
    const f = created();
    await openBrandRequestIssue(feature, { fetchFn: f });
    expect(vi.mocked(f).mock.calls[0][0]).toBe("https://api.github.com/repos/acme/brand-inbox/issues");
  });

  it("deps override env token and repo", async () => {
    const f = created();
    await openBrandRequestIssue(feature, { fetchFn: f, token: "dep", repo: "x/y" });
    const [url, init] = vi.mocked(f).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/x/y/issues");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer dep");
  });

  it("returns null and logs the status on 401", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const f = vi.fn(async () => new Response('{"message":"Bad credentials"}', { status: 401 })) as unknown as typeof fetch;
    expect(await openBrandRequestIssue(feature, { fetchFn: f, token: "bad" })).toBeNull();
    expect(String(err.mock.calls[0])).toContain("401");
  });

  it("survives a throwing fetch", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const f = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    await expect(openBrandRequestIssue(feature, { fetchFn: f, token: "t" })).resolves.toBeNull();
  });
});

import { brandIssueBody as _body } from "$lib/server/github-issues";
describe("brandIssueBody mentions", () => {
  it("disarms @mentions in company, name and details", () => {
    const { body, title } = _body({ id: "BR-TEST01", mode: "remove", company: "@octocat Inc", name: "@someone", logos: [], plan: null, details: "ping @maintainer please" });
    expect(body).not.toMatch(/@octocat/);
    expect(body).not.toMatch(/@someone/);
    expect(body).not.toMatch(/@maintainer/);
    expect(body).toContain("@​octocat");
    expect(title).toBeTruthy();
  });
});
