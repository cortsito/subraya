export interface Anchor {
  exact: string;
  prefix: string;
  suffix: string;
  position: {
    start: number;
    end: number;
  };
}

/** A fixed, allowlisted set of highlight colors. Never trust a raw stored string as one of these — go through `normalizePaletteColor`. */
export type PaletteColor = "yellow" | "coral" | "mint" | "sky" | "lilac";

export const PALETTE_COLORS: readonly PaletteColor[] = ["yellow", "coral", "mint", "sky", "lilac"];

export const PALETTE_HEX: Record<PaletteColor, string> = {
  yellow: "#ffe066",
  coral: "#ff8a75",
  mint: "#7be0b6",
  sky: "#7fc7ff",
  lilac: "#c6a6f7",
};

export const PALETTE_LABELS: Record<PaletteColor, string> = {
  yellow: "Yellow",
  coral: "Coral",
  mint: "Mint",
  sky: "Sky",
  lilac: "Lilac",
};

export const DEFAULT_PALETTE_COLOR: PaletteColor = "yellow";

/** Maps any stored or incoming value to a known-safe palette color, defaulting legacy/unknown values to Yellow. */
export function normalizePaletteColor(value: unknown): PaletteColor {
  return typeof value === "string" && (PALETTE_COLORS as readonly string[]).includes(value)
    ? (value as PaletteColor)
    : DEFAULT_PALETTE_COLOR;
}

export interface Idea {
  id: string;
  name: string;
  createdAt: string;
}

interface HighlightBase {
  id: string;
  text: string;
  url: string;
  title: string;
  domain: string;
  dateCreated: string;
  color: PaletteColor;
  /** Zero or one Idea a highlight is connected to. Absent means unconnected. */
  ideaId?: string;
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

export function isValidNewHighlightInput(input: NewHighlightInput): boolean {
  if (input.text.length === 0) return false;
  if (!(PALETTE_COLORS as readonly string[]).includes(input.color)) return false;
  if (input.sourceType === "pdf") {
    return Number.isInteger(input.pdfPage) && input.pdfPage >= 1;
  }
  return input.sourceType === "web";
}
