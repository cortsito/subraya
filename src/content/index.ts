import { DEFAULT_HIGHLIGHT_COLOR, type NewHighlightInput } from "../shared/types";
import type {
  ContentMessage,
  SaveHighlightMessage,
  SaveHighlightResponse,
} from "../shared/messages";
import { rangeKey } from "../shared/dedupe";
import { computeAnchor, isEditableTarget } from "./anchor";
import { paint } from "./highlightPainter";
import {
  hideHighlightButton,
  injectStyles,
  isHighlightButtonTarget,
  showActiveIndicator,
  showHighlightButton,
} from "./ui";

declare global {
  interface Window {
    __subrayaActive?: boolean;
  }
}

if (!window.__subrayaActive) {
  window.__subrayaActive = true;
  init();
}

function init(): void {
  injectStyles();
  showActiveIndicator();

  let pendingRange: Range | null = null;
  const paintedKeys = new Set<string>();

  function handleSelectionChange(event: Event): void {
    if (isHighlightButtonTarget(event.target)) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      pendingRange = null;
      hideHighlightButton();
      return;
    }

    const range = selection.getRangeAt(0);
    if (isEditableTarget(range.commonAncestorContainer)) {
      pendingRange = null;
      hideHighlightButton();
      return;
    }

    pendingRange = range.cloneRange();
    const rect = range.getBoundingClientRect();
    showHighlightButton(rect, () => {
      if (pendingRange) void saveAndPaint(pendingRange);
    });
  }

  async function saveAndPaint(range: Range): Promise<void> {
    const anchor = computeAnchor(range);
    const key = rangeKey(anchor.position);

    hideHighlightButton();

    if (paintedKeys.has(key)) return;

    const payload: NewHighlightInput = {
      text: anchor.exact,
      sourceType: "web",
      url: location.href,
      title: document.title,
      domain: location.hostname,
      color: DEFAULT_HIGHLIGHT_COLOR,
      anchor,
    };

    const message: SaveHighlightMessage = { type: "SAVE_HIGHLIGHT", payload };
    const response = (await chrome.runtime.sendMessage(message)) as SaveHighlightResponse;

    if (response.ok) {
      paint(response.highlight.id, range);
      paintedKeys.add(key);
    } else {
      console.warn("Subraya: failed to save highlight", response.error);
    }
  }

  document.addEventListener("mouseup", handleSelectionChange);
  document.addEventListener("keyup", handleSelectionChange);

  chrome.runtime.onMessage.addListener((message: ContentMessage) => {
    if (message.type !== "CONTEXT_MENU_HIGHLIGHT") return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    if (isEditableTarget(range.commonAncestorContainer)) return;

    void saveAndPaint(range.cloneRange());
  });
}
