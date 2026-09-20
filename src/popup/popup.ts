import type { ContentMessage } from "../shared/messages";

const statusEl = document.getElementById("status")!;
const activateButton = document.getElementById("activate")!;
const openLibraryButton = document.getElementById("open-library")!;

function setStatus(message: string): void {
  statusEl.textContent = message;
}

async function enableInteractionOnTab(tabId: number): Promise<void> {
  const message: ContentMessage = { type: "ENABLE_INTERACTION" };
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

activateButton.addEventListener("click", async () => {
  setStatus("Activating…");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setStatus("No active tab found.");
      return;
    }
    await enableInteractionOnTab(tab.id);
    setStatus("Activated on this page.");
  } catch {
    setStatus("Can't activate on this page.");
  }
});

openLibraryButton.addEventListener("click", () => {
  void chrome.tabs.create({ url: chrome.runtime.getURL("library/library.html") });
});
