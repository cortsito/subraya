import { describe, expect, it } from "vitest";
import type { PdfHighlight, WebHighlight } from "../shared/types";
import { buildMarkdownExport, exportFilename, formatExportDate } from "./markdown";

function makeHighlight(overrides: Partial<WebHighlight> = {}): WebHighlight {
  return {
    id: "id-1",
    text: "First highlighted passage",
    sourceType: "web",
    url: "https://example.com/article",
    title: "Page title",
    domain: "example.com",
    dateCreated: "2026-09-20T10:30:00.000Z",
    color: "#ffe066",
    anchor: { exact: "", prefix: "", suffix: "", position: { start: 0, end: 0 } },
    ...overrides,
  };
}

function makePdfHighlight(overrides: Partial<PdfHighlight> = {}): PdfHighlight {
  return {
    id: "id-pdf-1",
    text: "A highlighted PDF passage",
    sourceType: "pdf",
    url: "https://example.com/paper.pdf",
    title: "A Research Paper",
    domain: "example.com",
    dateCreated: "2026-09-20T10:30:00.000Z",
    color: "#ffe066",
    anchor: { exact: "", prefix: "", suffix: "", position: { start: 0, end: 0 } },
    pdfPage: 3,
    ...overrides,
  };
}

describe("buildMarkdownExport", () => {
  it("produces a header-only document for an empty export", () => {
    const md = buildMarkdownExport([], new Date("2026-09-20T00:00:00.000Z"));
    expect(md).toBe("# Subraya export\n\nExported: 2026-09-20\n");
  });

  it("groups highlights by exact source URL, one section per URL", () => {
    const highlights = [
      makeHighlight({
        id: "a",
        url: "https://example.com/one",
        domain: "example.com",
        dateCreated: "2026-09-20T12:00:00.000Z",
      }),
      makeHighlight({
        id: "b",
        url: "https://other.com/two",
        domain: "other.com",
        dateCreated: "2026-09-20T11:00:00.000Z",
      }),
      makeHighlight({
        id: "c",
        url: "https://example.com/one",
        domain: "example.com",
        dateCreated: "2026-09-20T10:00:00.000Z",
      }),
    ];

    const md = buildMarkdownExport(highlights, new Date("2026-09-20T00:00:00.000Z"));

    expect(md.match(/^## example\.com/gm)).toHaveLength(1);
    expect(md.match(/^## other\.com/gm)).toHaveLength(1);
    expect(md).toContain("Source: <https://example.com/one>");
    expect(md).toContain("Source: <https://other.com/two>");

    const exampleIndex = md.indexOf("## example.com");
    const otherIndex = md.indexOf("## other.com");
    expect(otherIndex).toBeGreaterThan(exampleIndex);
  });

  it("preserves multiline highlight text as blockquote lines", () => {
    const highlights = [
      makeHighlight({
        text: "First highlighted passage\nwith every original line preserved as a blockquote.",
      }),
    ];
    const md = buildMarkdownExport(highlights, new Date("2026-09-20T00:00:00.000Z"));
    expect(md).toContain(
      "> First highlighted passage\n> with every original line preserved as a blockquote.",
    );
  });

  it("falls back to the URL when the title is missing", () => {
    const highlights = [makeHighlight({ title: "" })];
    const md = buildMarkdownExport(highlights, new Date("2026-09-20T00:00:00.000Z"));
    expect(md).toContain("## example.com — https://example.com/article");
  });

  it("keeps highlights within a group in the given order", () => {
    const highlights = [
      makeHighlight({ id: "newer", text: "Newer passage", dateCreated: "2026-09-20T12:00:00.000Z" }),
      makeHighlight({ id: "older", text: "Older passage", dateCreated: "2026-09-20T09:00:00.000Z" }),
    ];
    const md = buildMarkdownExport(highlights, new Date("2026-09-20T00:00:00.000Z"));
    expect(md.indexOf("Newer passage")).toBeLessThan(md.indexOf("Older passage"));
  });

  it("exports only the highlights it is given (e.g. a filtered subset)", () => {
    const all = [
      makeHighlight({ id: "keep", text: "keep me", url: "https://example.com/keep" }),
      makeHighlight({ id: "drop", text: "drop me", url: "https://example.com/drop" }),
    ];
    const md = buildMarkdownExport([all[0]], new Date("2026-09-20T00:00:00.000Z"));
    expect(md).toContain("keep me");
    expect(md).not.toContain("drop me");
    expect(md).not.toContain("example.com/drop");
  });

  it("escapes HTML-like highlight text so raw markup isn't emitted", () => {
    const highlights = [
      makeHighlight({
        text: "<script>alert('x')</script> & <b>bold</b>\nline two <img src=x>",
      }),
    ];
    const md = buildMarkdownExport(highlights, new Date("2026-09-20T00:00:00.000Z"));
    expect(md).not.toContain("<script>");
    expect(md).not.toContain("<b>");
    expect(md).not.toContain("<img");
    expect(md).toContain("> &lt;script&gt;alert('x')&lt;/script&gt; &amp; &lt;b&gt;bold&lt;/b&gt;");
    expect(md).toContain("> line two &lt;img src=x&gt;");
  });

  it("normalizes and escapes a title containing markup and newlines", () => {
    const highlights = [
      makeHighlight({
        title: "Real title\n## Injected heading\n<script>evil()</script>",
      }),
    ];
    const md = buildMarkdownExport(highlights, new Date("2026-09-20T00:00:00.000Z"));
    expect(md).not.toContain("<script>");
    expect(md.match(/^##/gm)).toHaveLength(1);
    expect(md).toContain(
      "## example.com — Real title ## Injected heading &lt;script&gt;evil()&lt;/script&gt;",
    );
  });
});

describe("buildMarkdownExport (PDF highlights)", () => {
  it("includes the page number for a PDF highlight", () => {
    const md = buildMarkdownExport([makePdfHighlight({ pdfPage: 7 })], new Date("2026-09-20T00:00:00.000Z"));
    expect(md).toContain("Page: 7");
  });

  it("omits the page line for web highlights sharing the same export", () => {
    const md = buildMarkdownExport(
      [makeHighlight({ url: "https://example.com/paper.pdf" })],
      new Date("2026-09-20T00:00:00.000Z"),
    );
    expect(md).not.toContain("Page:");
  });

  it("places the page line between the quoted text and the saved date", () => {
    const md = buildMarkdownExport([makePdfHighlight({ pdfPage: 2 })], new Date("2026-09-20T00:00:00.000Z"));
    const pageIndex = md.indexOf("Page: 2");
    const savedIndex = md.indexOf("Saved:");
    expect(pageIndex).toBeGreaterThan(-1);
    expect(savedIndex).toBeGreaterThan(pageIndex);
  });
});

describe("exportFilename", () => {
  it("uses the subraya-YYYY-MM-DD.md pattern", () => {
    expect(exportFilename(new Date("2026-09-20T23:59:00.000Z"))).toBe("subraya-2026-09-20.md");
  });
});

describe("formatExportDate", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(formatExportDate(new Date("2026-01-05T00:00:00.000Z"))).toBe("2026-01-05");
  });
});
