export const HIGHLIGHT_CSS_NAME = "subraya-highlight";

let registeredHighlight: Highlight | undefined;
const paintedRanges = new Map<string, Range>();

function ensureHighlightRegistered(): Highlight {
  if (!registeredHighlight) {
    registeredHighlight = new Highlight();
    CSS.highlights.set(HIGHLIGHT_CSS_NAME, registeredHighlight);
  }
  return registeredHighlight;
}

export function paint(id: string, range: Range): void {
  const highlight = ensureHighlightRegistered();
  highlight.add(range);
  paintedRanges.set(id, range);
}

/** Removes every painted range. Used before a full re-render (e.g. PDF zoom change) invalidates existing Ranges. */
export function clearAll(): void {
  registeredHighlight?.clear();
  paintedRanges.clear();
}
