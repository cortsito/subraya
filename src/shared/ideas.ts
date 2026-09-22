import type { Highlight, Idea } from "./types";

export const MAX_IDEA_NAME_LENGTH = 80;

/** Trims and validates a user-entered Idea name. Returns null when it's empty or unreasonably long. */
export function normalizeIdeaName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_IDEA_NAME_LENGTH) return null;
  return trimmed;
}

export function sortIdeasByRecency(ideas: Idea[]): Idea[] {
  return [...ideas].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Returns a new Highlight with `ideaId` set, or removed when `ideaId` is null. Preserves identity when there's nothing to change. */
export function assignIdea(highlight: Highlight, ideaId: string | null): Highlight {
  if (ideaId === null) {
    if (!highlight.ideaId) return highlight;
    const next = { ...highlight };
    delete next.ideaId;
    return next;
  }
  if (highlight.ideaId === ideaId) return highlight;
  return { ...highlight, ideaId };
}

/**
 * Detaches every highlight belonging to `ideaId`, leaving the highlights
 * themselves fully intact — this is the only effect deleting an Idea should
 * have. Highlights that don't belong to `ideaId` are returned unchanged
 * (same reference), so callers can diff by identity to know what to persist.
 */
export function unassignHighlightsForIdea(highlights: Highlight[], ideaId: string): Highlight[] {
  return highlights.map((highlight) => (highlight.ideaId === ideaId ? assignIdea(highlight, null) : highlight));
}

export function countHighlightsByIdea(highlights: Highlight[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const highlight of highlights) {
    if (!highlight.ideaId) continue;
    counts.set(highlight.ideaId, (counts.get(highlight.ideaId) ?? 0) + 1);
  }
  return counts;
}
