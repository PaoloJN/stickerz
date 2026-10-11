import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const env = vi.hoisted(() => ({}) as Record<string, string | undefined>);
vi.mock("$env/dynamic/private", () => ({ env }));

const { getStars, _resetStarsCache } = await import("@/lib/server/github");

const ok = (body: unknown) =>
  vi.fn(
    async () => new Response(JSON.stringify(body), { status: 200 }),
  ) as unknown as typeof fetch;

describe("getStars", () => {
  beforeEach(() => _resetStarsCache());

  it("returns stargazers_count from the GitHub API", async () => {
    const f = ok({ stargazers_count: 4821 });
    expect(await getStars(f, 0)).toBe(4821);
    expect(f).toHaveBeenCalledWith(
      "https://api.github.com/repos/PaoloJN/stickerz",
      expect.anything(),
    );
  });

  it("returns null on a non-ok response (rate limited)", async () => {
    const f = vi.fn(
      async () => new Response("{}", { status: 403 }),
    ) as unknown as typeof fetch;
    expect(await getStars(f, 0)).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    const f = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await getStars(f, 0)).toBeNull();
  });

  it("caches the value for an hour", async () => {
    const f = ok({ stargazers_count: 10 });
    await getStars(f, 0);
    expect(await getStars(f, 59 * 60 * 1000)).toBe(10);
    expect(f).toHaveBeenCalledTimes(1);
    await getStars(f, 61 * 60 * 1000);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("caches a null result too, so failures don't retry on every request", async () => {
    const f = vi.fn(
      async () => new Response("{}", { status: 403 }),
    ) as unknown as typeof fetch;
    await getStars(f, 0);
    expect(await getStars(f, 1000)).toBeNull();
    expect(f).toHaveBeenCalledTimes(1);
  });

  describe("GITHUB_TOKEN", () => {
    afterEach(() => delete env.GITHUB_TOKEN);
    const headersOf = (f: typeof fetch) =>
      new Headers((vi.mocked(f).mock.calls[0][1] as RequestInit).headers);

    it("sends a bearer token when GITHUB_TOKEN is set (works while the repo is private)", async () => {
      env.GITHUB_TOKEN = "ghp_test";
      const f = ok({ stargazers_count: 1 });
      await getStars(f, 0);
      expect(headersOf(f).get("authorization")).toBe("Bearer ghp_test");
    });

    it("sends no authorization header without a token", async () => {
      const f = ok({ stargazers_count: 1 });
      await getStars(f, 0);
      expect(headersOf(f).has("authorization")).toBe(false);
    });
  });

  describe("2 s timeout", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    /** a promise that only settles (rejects) when the request's signal aborts, like a real stalled fetch */
    const stall = (signal: AbortSignal | null | undefined) =>
      new Promise<never>((_, reject) =>
        signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))),
      );

    it("gives up on a request that never answers", async () => {
      const f = vi.fn((_url: string, init?: RequestInit) => stall(init?.signal)) as unknown as typeof fetch;
      const p = getStars(f, 0);
      await vi.advanceTimersByTimeAsync(2000);
      expect(await p).toBeNull();
    });

    it("gives up when the headers arrive but the body stalls", async () => {
      const f = vi.fn(async (_url: string, init?: RequestInit) => ({
        ok: true,
        json: () => stall(init?.signal),
      })) as unknown as typeof fetch;
      const p = getStars(f, 0);
      await vi.advanceTimersByTimeAsync(2000);
      expect(await p).toBeNull();
    });
  });
});
