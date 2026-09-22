import { PALETTE_COLORS, PALETTE_HEX } from "../shared/types";
import { PALETTE_HIGHLIGHT_NAMES } from "./highlightPainter";

const INDICATOR_CLASS = "subraya-active-indicator";
const STYLE_ID = "subraya-styles";

function paletteHighlightRules(): string {
  return PALETTE_COLORS.map(
    (color) => `::highlight(${PALETTE_HIGHLIGHT_NAMES[color]}) { background-color: ${PALETTE_HEX[color]}; }`,
  ).join("\n    ");
}

export function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    ${paletteHighlightRules()}
    .${INDICATOR_CLASS} {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 2147483647;
      background: #1a1a1a;
      color: #fff;
      border-radius: 6px;
      padding: 6px 10px;
      font: 12px/1.4 system-ui, sans-serif;
      opacity: 0.9;
      transition: opacity 0.4s ease;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

export function showActiveIndicator(): void {
  const indicator = document.createElement("div");
  indicator.className = INDICATOR_CLASS;
  indicator.textContent = "Subraya active";
  document.body.appendChild(indicator);
  setTimeout(() => {
    indicator.style.opacity = "0";
    setTimeout(() => indicator.remove(), 400);
  }, 2000);
}
