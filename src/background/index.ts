import { addHighlight } from "../storage/db";
import type { BackgroundMessage, SaveHighlightResponse } from "../shared/messages";

const CONTEXT_MENU_ID = "subraya-highlight-selection";

chrome.contextMenus.removeAll(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Highlight selection",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID || !tab?.id) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/index.js"],
    });
    await chrome.tabs.sendMessage(tab.id, { type: "CONTEXT_MENU_HIGHLIGHT" });
  } catch (err) {
    console.warn("Subraya: could not activate on this page", err);
  }
});

chrome.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
  if (message.type !== "SAVE_HIGHLIGHT") return undefined;

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
});
