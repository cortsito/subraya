import { describe, expect, it } from "vitest";
import {
  assignIdea,
  countHighlightsByIdea,
  MAX_IDEA_NAME_LENGTH,
  normalizeIdeaName,
  sortIdeasByRecency,
  unassignHighlightsForIdea,
} from "./ideas";
import type { Idea, WebHighlight } from "./types";

function makeHighlight(overrides: Partial<WebHighlight> = {}): WebHighlight {
  return {
    id: "h-1",
    sourceType: "web",
    text: "Some highlighted text",
    url: "https://example.com/article",
    title: "Example Article",
    domain: "example.com",
    dateCreated: "2026-09-20T10:30:00.000Z",
    color: "yellow",
    anchor: { exact: "text", prefix: "", suffix: "", position: { start: 0, end: 4 } },
    ...overrides,
  };
}

function makeIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: "idea-1",
    name: "Research thread",
    createdAt: "2026-09-20T10:30:00.000Z",
    ...overrides,
  };
}

describe("legacy highlights", () => {
  it("a highlight without an ideaId is treated as unconnected", () => {
    const legacy = makeHighlight();
    expect(legacy.ideaId).toBeUndefined();
    expect(countHighlightsByIdea([legacy]).size).toBe(0);
  });
});

describe("normalizeIdeaName", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeIdeaName("  Research thread  ")).toBe("Research thread");
  });

  it("rejects an empty or whitespace-only name", () => {
    expect(normalizeIdeaName("")).toBeNull();
    expect(normalizeIdeaName("   ")).toBeNull();
  });

  it("accepts a name at the maximum length", () => {
    const name = "a".repeat(MAX_IDEA_NAME_LENGTH);
    expect(normalizeIdeaName(name)).toBe(name);
  });

  it("rejects a name past the maximum length", () => {
    const name = "a".repeat(MAX_IDEA_NAME_LENGTH + 1);
    expect(normalizeIdeaName(name)).toBeNull();
  });
});

describe("sortIdeasByRecency", () => {
  it("sorts newest createdAt first", () => {
    const older = makeIdea({ id: "old", createdAt: "2026-09-01T00:00:00.000Z" });
    const newer = makeIdea({ id: "new", createdAt: "2026-09-20T00:00:00.000Z" });
    expect(sortIdeasByRecency([older, newer])).toEqual([newer, older]);
  });

  it("does not mutate the input array", () => {
    const older = makeIdea({ id: "old", createdAt: "2026-09-01T00:00:00.000Z" });
    const newer = makeIdea({ id: "new", createdAt: "2026-09-20T00:00:00.000Z" });
    const input = [older, newer];
    sortIdeasByRecency(input);
    expect(input).toEqual([older, newer]);
  });
});

describe("assignIdea", () => {
  it("connects a highlight to an Idea", () => {
    const highlight = makeHighlight();
    const assigned = assignIdea(highlight, "idea-1");
    expect(assigned.ideaId).toBe("idea-1");
  });

  it("disconnects a highlight from its Idea when given null", () => {
    const highlight = makeHighlight({ ideaId: "idea-1" });
    const unassigned = assignIdea(highlight, null);
    expect(unassigned.ideaId).toBeUndefined();
  });

  it("leaves the rest of the highlight untouched", () => {
    const highlight = makeHighlight({ text: "keep me" });
    const assigned = assignIdea(highlight, "idea-1");
    expect(assigned.text).toBe("keep me");
    expect(assigned.id).toBe(highlight.id);
  });

  it("returns the same reference when unassigning an already-unconnected highlight", () => {
    const highlight = makeHighlight();
    expect(assignIdea(highlight, null)).toBe(highlight);
  });
});

describe("unassignHighlightsForIdea", () => {
  it("unassigns only highlights connected to the deleted Idea, without deleting any highlight", () => {
    const connected = makeHighlight({ id: "a", ideaId: "idea-1" });
    const otherIdea = makeHighlight({ id: "b", ideaId: "idea-2" });
    const unconnected = makeHighlight({ id: "c" });

    const result = unassignHighlightsForIdea([connected, otherIdea, unconnected], "idea-1");

    expect(result).toHaveLength(3);
    expect(result.map((h) => h.id)).toEqual(["a", "b", "c"]);
    expect(result.find((h) => h.id === "a")?.ideaId).toBeUndefined();
    expect(result.find((h) => h.id === "b")?.ideaId).toBe("idea-2");
    expect(result.find((h) => h.id === "c")?.ideaId).toBeUndefined();
  });

  it("returns unaffected highlights by the same reference", () => {
    const otherIdea = makeHighlight({ id: "b", ideaId: "idea-2" });
    const [result] = unassignHighlightsForIdea([otherIdea], "idea-1");
    expect(result).toBe(otherIdea);
  });
});

describe("countHighlightsByIdea", () => {
  it("counts highlights per Idea and ignores unconnected ones", () => {
    const counts = countHighlightsByIdea([
      makeHighlight({ id: "a", ideaId: "idea-1" }),
      makeHighlight({ id: "b", ideaId: "idea-1" }),
      makeHighlight({ id: "c", ideaId: "idea-2" }),
      makeHighlight({ id: "d" }),
    ]);
    expect(counts.get("idea-1")).toBe(2);
    expect(counts.get("idea-2")).toBe(1);
    expect(counts.has("idea-3")).toBe(false);
  });
});
