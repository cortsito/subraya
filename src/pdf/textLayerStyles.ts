import { PALETTE_HIGHLIGHT_NAMES } from "../content/highlightPainter";
import { PALETTE_COLORS, PALETTE_HEX } from "../shared/types";

export const PAGE_CLASS = "subraya-pdf-page";
export const TEXT_LAYER_CLASS = "subraya-text-layer";
const STYLE_ID = "subraya-pdf-text-layer-styles";

/**
 * Translucent version of every fixed palette `::highlight()` rule, so PDF
 * canvas text stays visible underneath. Built only from the fixed
 * PALETTE_COLORS/PALETTE_HIGHLIGHT_NAMES allowlists — never from stored data.
 */
function translucentPaletteHighlightRules(): string {
  return PALETTE_COLORS.map(
    (color) =>
      `::highlight(${PALETTE_HIGHLIGHT_NAMES[color]}) { background-color: color-mix(in srgb, ${PALETTE_HEX[color]} 45%, transparent); }`,
  ).join("\n    ");
}

// Hand-written subset of pdf.js's own text-layer stylesheet (web/pdf_viewer.css):
// just enough for TextLayer's inline per-span transforms/font-size calc()
// expressions to resolve, and for the glyphs to stay invisible-but-selectable
// over the canvas. We render pages ourselves (no PDFPageView), so the rest of
// that stylesheet — annotations, forms, the built-in viewer chrome — doesn't apply.
//
// --total-scale-factor is set per page (in viewer.ts's renderPage, as an
// inline style on .subraya-pdf-page) to the same viewport scale used for the
// canvas; it inherits from there down into the text layer and its spans. The
// :root default below is only a defensive fallback in case calc() ever
// resolves before that inline value is set.
export function injectTextLayerStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      --total-scale-factor: 1;
    }
    .${PAGE_CLASS} {
      position: relative;
      margin: 0 auto 16px;
      --scale-round-x: 1px;
      --scale-round-y: 1px;
    }
    .${PAGE_CLASS} canvas {
      display: block;
    }
    .${TEXT_LAYER_CLASS} {
      position: absolute;
      inset: 0;
      overflow: clip;
      opacity: 1;
      line-height: 1;
      text-align: initial;
      transform-origin: 0 0;
      --min-font-size: 1;
      --text-scale-factor: calc(var(--total-scale-factor) * var(--min-font-size));
      --min-font-size-inv: calc(1 / var(--min-font-size));
    }
    .${TEXT_LAYER_CLASS} span,
    .${TEXT_LAYER_CLASS} br {
      color: transparent;
      position: absolute;
      white-space: pre;
      cursor: text;
      transform-origin: 0% 0%;
      user-select: text;
    }
    .${TEXT_LAYER_CLASS} span {
      --font-height: 0;
      font-size: calc(var(--text-scale-factor) * var(--font-height));
      --scale-x: 1;
      --rotate: 0deg;
      transform: rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv));
    }

    /*
     * The generic ::highlight() rules (content/ui.ts's injectStyles(),
     * applied before this stylesheet) paint web-page highlights with a fully
     * opaque background, one per palette color. Over a PDF, the canvas — not
     * the (transparent) text layer — is the visible glyph source, so an
     * opaque highlight would hide it entirely. These later, equal-specificity
     * rules override them for PDF pages only, without touching web-page
     * highlight styling.
     */
    ${translucentPaletteHighlightRules()}
  `;
  document.head.appendChild(style);
}
