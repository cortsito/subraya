const statusEl = document.getElementById("status")!;
const activateButton = document.getElementById("activate")!;
const openLibraryButton = document.getElementById("open-library")!;

function setStatus(message: string): void {
  statusEl.textContent = message;
}

activateButton.addEventListener("click", async () => {
  setStatus("Activating…");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setStatus("No active tab found.");
      return;
    }
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/index.js"],
    });
    setStatus("Activated on this page.");
  } catch {
    setStatus("Can't activate on this page.");
  }
});

openLibraryButton.addEventListener("click", () => {
  void chrome.tabs.create({ url: chrome.runtime.getURL("library/library.html") });
});
