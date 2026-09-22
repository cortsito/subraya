import { addHighlight, createIdea, listHighlightsForUrl, listIdeas } from "../storage/db";
import type {
  BackgroundMessage,
  ContentMessage,
  CreateIdeaResponse,
  ListHighlightsForUrlResponse,
  ListIdeasResponse,
  SaveHighlightResponse,
} from "../shared/messages";

const CONTEXT_MENU_ID = "subraya-highlight-selection";

chrome.contextMenus.removeAll(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Highlight selection",
    contexts: ["selection"],
  });
});

async function sendToContentScript(tabId: number, message: ContentMessage): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content/index.js"],
    });
    await chrome.tabs.sendMessage(tabId, message);
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID || !tab?.id) return;

  try {
    await sendToContentScript(tab.id, { type: "CONTEXT_MENU_HIGHLIGHT" });
  } catch (err) {
    console.warn("Subraya: could not activate on this page", err);
  }
});

chrome.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
  if (message.type === "SAVE_HIGHLIGHT") {
    addHighlight(message.payload)
      .then((highlight) => {
        const response: SaveHighlightResponse = { ok: true, highlight };
        sendResponse(response);
      })
      .catch((err: unknown) => {
        const response: SaveHighlightResponse = {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
        sendResponse(response);
      });
    return true;
  }

  if (message.type === "LIST_HIGHLIGHTS_FOR_URL") {
    listHighlightsForUrl(message.url)
      .then((highlights) => {
        const response: ListHighlightsForUrlResponse = { ok: true, highlights };
        sendResponse(response);
      })
      .catch((err: unknown) => {
        const response: ListHighlightsForUrlResponse = {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
        sendResponse(response);
      });
    return true;
  }

  if (message.type === "LIST_IDEAS") {
    listIdeas()
      .then((ideas) => {
        const response: ListIdeasResponse = { ok: true, ideas };
        sendResponse(response);
      })
      .catch((err: unknown) => {
        const response: ListIdeasResponse = {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
        sendResponse(response);
      });
    return true;
  }

  if (message.type === "CREATE_IDEA") {
    createIdea(message.name)
      .then((idea) => {
        const response: CreateIdeaResponse = { ok: true, idea };
        sendResponse(response);
      })
      .catch((err: unknown) => {
        const response: CreateIdeaResponse = {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
        sendResponse(response);
      });
    return true;
  }

  return undefined;
});
