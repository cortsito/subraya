export interface Anchor {
  exact: string;
  prefix: string;
  suffix: string;
  position: {
    start: number;
    end: number;
  };
}

interface HighlightBase {
  id: string;
  text: string;
  url: string;
  title: string;
  domain: string;
  dateCreated: string;
  color: string;
  anchor: Anchor;
}

export interface WebHighlight extends HighlightBase {
  sourceType: "web";
}

/** `anchor` is scoped to that page's text layer, not the whole document. */
export interface PdfHighlight extends HighlightBase {
  sourceType: "pdf";
  pdfPage: number;
}

export type Highlight = WebHighlight | PdfHighlight;

// A plain `Omit<Highlight, K>` computes `keyof Highlight` as the intersection
// of both members' keys, which would drop `pdfPage` and collapse the
// discriminant. Distributing over the union first preserves each variant.
type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

export type NewHighlightInput = DistributiveOmit<Highlight, "id" | "dateCreated">;

export const DEFAULT_HIGHLIGHT_COLOR = "#ffe066";

export function isValidNewHighlightInput(input: NewHighlightInput): boolean {
  if (input.text.length === 0) return false;
  if (input.sourceType === "pdf") {
    return Number.isInteger(input.pdfPage) && input.pdfPage >= 1;
  }
  return input.sourceType === "web";
}
