import { DEFAULT_HIGHLIGHT_COLOR } from "../shared/types";
import { HIGHLIGHT_CSS_NAME } from "./highlightPainter";

const BUTTON_CLASS = "subraya-highlight-button";
const INDICATOR_CLASS = "subraya-active-indicator";
const STYLE_ID = "subraya-styles";

let currentButton: HTMLButtonElement | null = null;

export function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    ::highlight(${HIGHLIGHT_CSS_NAME}) {
      background-color: ${DEFAULT_HIGHLIGHT_COLOR};
    }
    .${BUTTON_CLASS} {
      position: fixed;
      z-index: 2147483647;
      background: #1a1a1a;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 6px 12px;
      font: 13px/1.4 system-ui, sans-serif;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    }
    .${BUTTON_CLASS}:hover {
      background: #333;
    }
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

export function isHighlightButtonTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(`.${BUTTON_CLASS}`) !== null;
}

export function showHighlightButton(rect: DOMRect, onClick: () => void): void {
  hideHighlightButton();
  const button = document.createElement("button");
  button.type = "button";
  button.className = BUTTON_CLASS;
  button.textContent = "Highlight";
  button.style.top = `${Math.max(rect.top - 36, 8)}px`;
  button.style.left = `${Math.max(rect.left, 8)}px`;
  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });
  button.addEventListener("click", onClick);
  document.body.appendChild(button);
  currentButton = button;
}

export function hideHighlightButton(): void {
  currentButton?.remove();
  currentButton = null;
}
