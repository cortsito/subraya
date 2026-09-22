import { DEFAULT_PALETTE_COLOR, normalizePaletteColor, type PaletteColor } from "../shared/types";

/**
 * One CSS Custom Highlight name per palette color, fixed and explicit. A CSS
 * highlight name must never be derived directly from a stored `color` value
 * (arbitrary/corrupted data could otherwise become part of a CSS identifier)
 * — always go through this map, keyed by an already-normalized PaletteColor.
 */
export const PALETTE_HIGHLIGHT_NAMES: Record<PaletteColor, string> = {
  yellow: "subraya-highlight-yellow",
  coral: "subraya-highlight-coral",
  mint: "subraya-highlight-mint",
  sky: "subraya-highlight-sky",
  lilac: "subraya-highlight-lilac",
};

/** Safe for arbitrary/untrusted input: normalizes first, so the result is always one of the fixed names above. */
export function cssHighlightNameForColor(color: unknown): string {
  return PALETTE_HIGHLIGHT_NAMES[normalizePaletteColor(color)];
}

const registeredHighlights = new Map<PaletteColor, Highlight>();
const paintedEntries = new Map<string, { color: PaletteColor; range: Range }>();

function ensureHighlightRegistered(color: PaletteColor): Highlight {
  let highlight = registeredHighlights.get(color);
  if (!highlight) {
    highlight = new Highlight();
    CSS.highlights.set(PALETTE_HIGHLIGHT_NAMES[color], highlight);
    registeredHighlights.set(color, highlight);
  }
  return highlight;
}

export function paint(id: string, range: Range, color: PaletteColor = DEFAULT_PALETTE_COLOR): void {
  const normalized = normalizePaletteColor(color);
  const highlight = ensureHighlightRegistered(normalized);
  highlight.add(range);
  paintedEntries.set(id, { color: normalized, range });
}

/** Removes every painted range across every color group. Used before a full re-render (e.g. PDF zoom change) invalidates existing Ranges. */
export function clearAll(): void {
  for (const highlight of registeredHighlights.values()) {
    highlight.clear();
  }
  paintedEntries.clear();
}
