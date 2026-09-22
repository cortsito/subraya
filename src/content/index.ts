import type { Idea, NewHighlightInput, PaletteColor } from "../shared/types";
import type {
  ContentMessage,
  CreateIdeaMessage,
  CreateIdeaResponse,
  ListHighlightsForUrlMessage,
  ListHighlightsForUrlResponse,
  ListIdeasMessage,
  ListIdeasResponse,
  SaveHighlightMessage,
  SaveHighlightResponse,
} from "../shared/messages";
import { rangeKey } from "../shared/dedupe";
import { computeAnchor, isEditableTarget } from "./anchor";
import { resolveAnchor } from "./resolver";
import { paint } from "./highlightPainter";
import { hideSelectionPopover, isPopoverTarget, RECENT_IDEAS_LIMIT, showSelectionPopover } from "./popover";
import { injectStyles, showActiveIndicator } from "./ui";

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

    paint(highlight.id, range, highlight.color);
    paintedKeys.add(key);
  }
}

async function fetchRecentIdeas(): Promise<Idea[]> {
  const message: ListIdeasMessage = { type: "LIST_IDEAS" };
  try {
    const response = (await chrome.runtime.sendMessage(message)) as ListIdeasResponse;
    return response.ok ? response.ideas.slice(0, RECENT_IDEAS_LIMIT) : [];
  } catch {
    return [];
  }
}

// The Idea most recently created from this popover, kept selected as the
// default for subsequent highlights in this session.
let lastCreatedIdea: Idea | null = null;

async function requestCreateIdea(name: string): Promise<Idea | null> {
  const message: CreateIdeaMessage = { type: "CREATE_IDEA", name };
  try {
    const response = (await chrome.runtime.sendMessage(message)) as CreateIdeaResponse;
    if (!response.ok) return null;
    lastCreatedIdea = response.idea;
    return response.idea;
  } catch {
    return null;
  }
}

function withStickyIdea(ideas: Idea[]): Idea[] {
  if (!lastCreatedIdea) return ideas;
  if (ideas.some((idea) => idea.id === lastCreatedIdea!.id)) return ideas;
  return [lastCreatedIdea, ...ideas];
}

// Bumped whenever the current selection is invalidated, so an idea fetch that
// resolves after the user has already moved on doesn't pop open a stale popover.
let selectionGeneration = 0;

function openPopoverForSelection(range: Range, rect: DOMRect): void {
  const myGeneration = ++selectionGeneration;
  void (async () => {
    const ideas = await fetchRecentIdeas();
    if (myGeneration !== selectionGeneration) return;
    showSelectionPopover({
      rect,
      ideas: withStickyIdea(ideas),
      selectedIdeaId: lastCreatedIdea?.id ?? null,
      onSave: (color, ideaId) => {
        void saveAndPaint(range, color, ideaId);
      },
      onCreateIdea: requestCreateIdea,
    });
  })();
}

/** Enables the interactive selection UI. Safe to call more than once. */
function enableInteraction(): void {
  if (window.__subrayaInteractive) return;
  window.__subrayaInteractive = true;

  showActiveIndicator();

  function handleSelectionChange(event: Event): void {
    if (isPopoverTarget(event.target)) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      selectionGeneration++;
      hideSelectionPopover();
      return;
    }

    const liveRange = selection.getRangeAt(0);
    if (isEditableTarget(liveRange.commonAncestorContainer)) {
      selectionGeneration++;
      hideSelectionPopover();
      return;
    }

    const range = liveRange.cloneRange();
    const rect = range.getBoundingClientRect();
    openPopoverForSelection(range, rect);
  }

  document.addEventListener("mouseup", handleSelectionChange);
  document.addEventListener("keyup", handleSelectionChange);
}

function handleContextMenuSelection(): void {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;

  const liveRange = selection.getRangeAt(0);
  if (isEditableTarget(liveRange.commonAncestorContainer)) return;

  const range = liveRange.cloneRange();
  const rect = range.getBoundingClientRect();
  openPopoverForSelection(range, rect);
}

async function saveAndPaint(range: Range, color: PaletteColor, ideaId: string | null): Promise<void> {
  const anchor = computeAnchor(range);
  const key = rangeKey(anchor.position);

  if (paintedKeys.has(key)) return;

  const payload: NewHighlightInput = {
    text: anchor.exact,
    sourceType: "web",
    url: location.href,
    title: document.title,
    domain: location.hostname,
    color,
    anchor,
    ...(ideaId ? { ideaId } : {}),
  };

  const message: SaveHighlightMessage = { type: "SAVE_HIGHLIGHT", payload };
  const response = (await chrome.runtime.sendMessage(message)) as SaveHighlightResponse;

  if (response.ok) {
    paint(response.highlight.id, range, color);
    paintedKeys.add(key);
  } else {
    console.warn("Subraya: failed to save highlight", response.error);
  }
}
