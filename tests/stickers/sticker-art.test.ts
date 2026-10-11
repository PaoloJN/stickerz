import { describe, expect, it } from "vitest";
import { libraryFile, stickerArtUrl, stickerSvg } from "../../src/lib/stickers/sticker-art";

const cut = { d: "M-50 -50L50 -50L50 50L-50 50Z", aspect: 1 };
const tags = (svg: string) => svg.match(/<svg\b[^>]*>/g) ?? [];

describe("stickerSvg", () => {
  it("puts the vinyl behind the logo and sizes the logo in the art box", () => {
    const out = stickerSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M0 0h24v24H0z"/></svg>', cut)!;
    expect(out.indexOf('fill="#fff"')).toBeLessThan(out.indexOf("M0 0h24v24H0z"));
    const nested = tags(out)[1];
    expect(nested).toContain('width="100"');
    expect(nested).toContain('viewBox="0 0 24 24"');
    expect(nested.match(/width=/g)).toHaveLength(1);
  });

  it("never duplicates attributes the logo already sets", () => {
    const out = stickerSvg('<svg viewBox="0 0 10 10" preserveAspectRatio="none" x="3"><rect/></svg>', cut)!;
    const nested = tags(out)[1];
    expect(nested.match(/preserveAspectRatio=/g)).toHaveLength(1);
    expect(nested.match(/\sx=/g)).toHaveLength(1);
  });

  it("handles a closing tag split across lines and a missing viewBox", () => {
    const out = stickerSvg('<svg\n width="54"\n height="43"\n><text>Qt</text\n></svg\n>', cut)!;
    expect(out).toContain('viewBox="0 0 54 43"');
    expect(out.endsWith("</svg></svg>")).toBe(true);
    expect(out).not.toContain("</svg\n");
  });

  it("draws just the logo when there's no cut, and rejects non-SVG", () => {
    expect(stickerSvg('<svg viewBox="0 0 1 1"><g/></svg>', null)).not.toContain('fill="#fff"');
    expect(stickerSvg("<html></html>", cut)).toBeNull();
    expect(stickerSvg("<svg><g/></svg>", cut)).toBeNull();
  });
});

it("maps library art hrefs to sticker images", () => {
  expect(libraryFile("/library/vercel.svg")).toBe("vercel.svg");
  expect(libraryFile("library/trpc_wordmark_dark.svg")).toBe("trpc_wordmark_dark.svg");
  expect(stickerArtUrl("/stickers/fixed/github.svg")).toBeNull();
  expect(stickerArtUrl("blob:abc")).toBeNull();
});

it("light-coloured art gets a dark-vinyl sticker", () => {
  expect(stickerArtUrl("/library/vercel_dark.svg", true)).toBe("/sticker-art/dark/vercel_dark.svg");
  const out = stickerSvg('<svg viewBox="0 0 1 1"><g/></svg>', cut, 1, "#121212")!;
  expect(out).toContain('fill="#121212"');
});
