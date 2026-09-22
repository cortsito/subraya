import type { Highlight } from "../shared/types";

export function filterHighlights(highlights: Highlight[], query: string): Highlight[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return highlights;

  return highlights.filter(
    (highlight) =>
      highlight.text.toLowerCase().includes(needle) ||
      highlight.title.toLowerCase().includes(needle) ||
      highlight.domain.toLowerCase().includes(needle) ||
      highlight.url.toLowerCase().includes(needle),
  );
}

export function selectExportTargets(highlights: Highlight[], query: string): Highlight[] {
  return query.trim() ? filterHighlights(highlights, query) : highlights;
}
