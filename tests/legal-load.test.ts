import { describe, expect, it } from "vitest";
import { isHttpError, isRedirect } from "@sveltejs/kit";
import { load } from "../src/routes/legal/[doc]/+page.server";

// the load is synchronous; cast the event since only `params` is read
const run = (doc: string) => (load as unknown as (e: { params: { doc: string } }) => unknown)({ params: { doc } });

function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  throw new Error("expected load to throw");
}

describe("legal [doc] load", () => {
  it("301-redirects an alias to its canonical doc", () => {
    const e = thrown(() => run("tm"));
    expect(isRedirect(e)).toBe(true);
    expect(e).toMatchObject({ status: 301, location: "/legal/trademark" });
  });
  it("404s on prototype keys instead of resolving them as aliases", () => {
    for (const doc of ["constructor", "__proto__", "toString"]) {
      const e = thrown(() => run(doc));
      expect(isHttpError(e)).toBe(true);
      expect(e).toMatchObject({ status: 404 });
    }
  });
  it("404s on unknown slugs", () => {
    const e = thrown(() => run("x"));
    expect(isHttpError(e) && e.status).toBe(404);
  });
  it("returns the doc for a real slug", () => {
    expect(run("privacy")).toMatchObject({ doc: { slug: "privacy" } });
  });
});
