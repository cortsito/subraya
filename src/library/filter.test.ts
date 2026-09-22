import { describe, expect, it } from "vitest";
import type { WebHighlight } from "../shared/types";
import { filterHighlights, selectExportTargets } from "./filter";

function makeHighlight(overrides: Partial<WebHighlight> = {}): WebHighlight {
  return {
    id: "id-1",
    text: "Some highlighted text",
    sourceType: "web",
    url: "https://example.com/article",
    title: "Example Article",
    domain: "example.com",
    dateCreated: "2026-09-20T10:30:00.000Z",
    color: "#ffe066",
    anchor: { exact: "Some highlighted text", prefix: "", suffix: "", position: { start: 0, end: 5 } },
    ...overrides,
  };
}

describe("filterHighlights", () => {
  it("returns everything for an empty or blank query", () => {
    const highlights = [makeHighlight(), makeHighlight({ id: "id-2" })];
    expect(filterHighlights(highlights, "")).toEqual(highlights);
    expect(filterHighlights(highlights, "   ")).toEqual(highlights);
  });

  it("matches highlighted text case-insensitively", () => {
    const highlights = [makeHighlight({ text: "The Quick Brown Fox" })];
    expect(filterHighlights(highlights, "quick brown")).toHaveLength(1);
    expect(filterHighlights(highlights, "QUICK")).toHaveLength(1);
    expect(filterHighlights(highlights, "slow")).toHaveLength(0);
  });

  it("matches page title case-insensitively", () => {
    const highlights = [makeHighlight({ title: "Understanding TypeScript" })];
    expect(filterHighlights(highlights, "typescript")).toHaveLength(1);
    expect(filterHighlights(highlights, "TYPESCRIPT")).toHaveLength(1);
  });

  it("matches domain case-insensitively", () => {
    const highlights = [makeHighlight({ domain: "Example.COM" })];
    expect(filterHighlights(highlights, "example.com")).toHaveLength(1);
  });

  it("matches URL case-insensitively", () => {
    const highlights = [makeHighlight({ url: "https://example.com/Articles/Deep-Dive" })];
    expect(filterHighlights(highlights, "deep-dive")).toHaveLength(1);
  });

  it("excludes highlights that match none of the fields", () => {
    const highlights = [makeHighlight()];
    expect(filterHighlights(highlights, "no match anywhere")).toHaveLength(0);
  });
});

describe("selectExportTargets", () => {
  it("returns everything when there is no active search", () => {
    const highlights = [makeHighlight(), makeHighlight({ id: "id-2", text: "other passage" })];
    expect(selectExportTargets(highlights, "")).toEqual(highlights);
    expect(selectExportTargets(highlights, "   ")).toEqual(highlights);
  });

  it("returns only the filtered results when a search query is active", () => {
    const highlights = [
      makeHighlight({ id: "id-1", text: "keep me" }),
      makeHighlight({ id: "id-2", text: "drop me" }),
    ];
    expect(selectExportTargets(highlights, "keep")).toEqual([highlights[0]]);
  });
});
