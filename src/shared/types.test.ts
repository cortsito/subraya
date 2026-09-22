import { describe, expect, it } from "vitest";
import { isValidNewHighlightInput, type NewHighlightInput, type PdfHighlight, type WebHighlight } from "./types";

type NewWebHighlightInput = Omit<WebHighlight, "id" | "dateCreated">;
type NewPdfHighlightInput = Omit<PdfHighlight, "id" | "dateCreated">;

function webInput(overrides: Partial<NewWebHighlightInput> = {}): NewHighlightInput {
  return {
    sourceType: "web",
    text: "Some highlighted text",
    url: "https://example.com/article",
    title: "Example Article",
    domain: "example.com",
    color: "#ffe066",
    anchor: { exact: "Some highlighted text", prefix: "", suffix: "", position: { start: 0, end: 5 } },
    ...overrides,
  };
}

function pdfInput(overrides: Partial<NewPdfHighlightInput> = {}): NewHighlightInput {
  return {
    sourceType: "pdf",
    text: "Some highlighted text",
    url: "https://example.com/paper.pdf",
    title: "A Paper",
    domain: "example.com",
    color: "#ffe066",
    anchor: { exact: "Some highlighted text", prefix: "", suffix: "", position: { start: 0, end: 5 } },
    pdfPage: 1,
    ...overrides,
  };
}

describe("isValidNewHighlightInput", () => {
  it("accepts a well-formed web highlight", () => {
    expect(isValidNewHighlightInput(webInput())).toBe(true);
  });

  it("accepts a well-formed PDF highlight", () => {
    expect(isValidNewHighlightInput(pdfInput({ pdfPage: 1 }))).toBe(true);
    expect(isValidNewHighlightInput(pdfInput({ pdfPage: 42 }))).toBe(true);
  });

  it("rejects empty highlighted text regardless of source type", () => {
    expect(isValidNewHighlightInput(webInput({ text: "" }))).toBe(false);
    expect(isValidNewHighlightInput(pdfInput({ text: "" }))).toBe(false);
  });

  it("rejects a PDF highlight with a zero or negative page number", () => {
    expect(isValidNewHighlightInput(pdfInput({ pdfPage: 0 }))).toBe(false);
    expect(isValidNewHighlightInput(pdfInput({ pdfPage: -1 }))).toBe(false);
  });

  it("rejects a PDF highlight with a non-integer page number", () => {
    expect(isValidNewHighlightInput(pdfInput({ pdfPage: 1.5 }))).toBe(false);
    expect(isValidNewHighlightInput(pdfInput({ pdfPage: Number.NaN }))).toBe(false);
  });

  it("rejects a PDF highlight missing a page number", () => {
    const withoutPage = pdfInput() as Partial<NewPdfHighlightInput>;
    delete withoutPage.pdfPage;
    expect(isValidNewHighlightInput(withoutPage as NewHighlightInput)).toBe(false);
  });
});
