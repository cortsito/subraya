import { describe, expect, it } from "vitest";
import type { Highlight } from "../shared/types";
import { pdfPageLabel } from "./sourceLabel";

function webHighlight(): Highlight {
  return {
    id: "id-1",
    sourceType: "web",
    text: "text",
    url: "https://example.com/article",
    title: "Article",
    domain: "example.com",
    dateCreated: "2026-09-20T10:30:00.000Z",
    color: "yellow",
    anchor: { exact: "text", prefix: "", suffix: "", position: { start: 0, end: 4 } },
  };
}

function pdfHighlight(pdfPage: number): Highlight {
  return {
    id: "id-2",
    sourceType: "pdf",
    text: "text",
    url: "https://example.com/paper.pdf",
    title: "Paper",
    domain: "example.com",
    dateCreated: "2026-09-20T10:30:00.000Z",
    color: "yellow",
    anchor: { exact: "text", prefix: "", suffix: "", position: { start: 0, end: 4 } },
    pdfPage,
  };
}

describe("pdfPageLabel", () => {
  it("returns null for web highlights", () => {
    expect(pdfPageLabel(webHighlight())).toBeNull();
  });

  it("formats a PDF · Page N label for PDF highlights", () => {
    expect(pdfPageLabel(pdfHighlight(5))).toBe("PDF · Page 5");
  });
});
