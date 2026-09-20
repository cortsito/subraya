import { DEFAULT_HIGHLIGHT_COLOR, type NewHighlightInput } from "../shared/types";
import type {
  ContentMessage,
  ListHighlightsForUrlMessage,
  ListHighlightsForUrlResponse,
  SaveHighlightMessage,
  SaveHighlightResponse,
} from "../shared/messages";
import { rangeKey } from "../shared/dedupe";
import { computeAnchor, isEditableTarget } from "./anchor";
import { resolveAnchor } from "./resolver";
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
    __subrayaLoaded?: boolean;
    __subrayaInteractive?: boolean;
  }
}

const paintedKeys = new Set<string>();

if (!window.__subrayaLoaded) {
  window.__subrayaLoaded = true;
  init();
}

function init(): void {
  injectStyles();
  void restoreHighlights();

  chrome.runtime.onMessage.addListener((message: ContentMessage) => {
    if (message.type === "ENABLE_INTERACTION") {
      enableInteraction();
    } else if (message.type === "CONTEXT_MENU_HIGHLIGHT") {
      handleContextMenuSelection();
    }
  });
}

/** Silently restores previously saved highlights for this exact URL. Never shows any UI. */
async function restoreHighlights(): Promise<void> {
  const request: ListHighlightsForUrlMessage = {
    type: "LIST_HIGHLIGHTS_FOR_URL",
    url: location.href,
  };

  let response: ListHighlightsForUrlResponse;
  try {
    response = (await chrome.runtime.sendMessage(request)) as ListHighlightsForUrlResponse;
  } catch {
    return;
  }
  if (!response.ok) return;

  for (const highlight of response.highlights) {
    const key = rangeKey(highlight.anchor.position);
    if (paintedKeys.has(key)) continue;

    const range = resolveAnchor(highlight.anchor);
    if (!range) continue;

    paint(highlight.id, range);
    paintedKeys.add(key);
  }
}

/** Enables the interactive selection UI. Safe to call more than once. */
function enableInteraction(): void {
  if (window.__subrayaInteractive) return;
  window.__subrayaInteractive = true;

  showActiveIndicator();

  let pendingRange: Range | null = null;

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

  document.addEventListener("mouseup", handleSelectionChange);
  document.addEventListener("keyup", handleSelectionChange);
}

function handleContextMenuSelection(): void {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  if (isEditableTarget(range.commonAncestorContainer)) return;

  void saveAndPaint(range.cloneRange());
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
