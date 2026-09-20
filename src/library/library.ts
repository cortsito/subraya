import { deleteHighlight, listHighlights } from "../storage/db";
import type { Highlight } from "../shared/types";

const listEl = document.getElementById("list")!;
const emptyEl = document.getElementById("empty")!;

function renderItem(highlight: Highlight): HTMLElement {
  const item = document.createElement("div");
  item.className = "highlight-item";

  const text = document.createElement("p");
  text.className = "highlight-text";
  text.textContent = highlight.text;
  text.title = highlight.text;

  const meta = document.createElement("div");
  meta.className = "highlight-meta";

  const domain = document.createElement("span");
  domain.textContent = highlight.domain;

  const link = document.createElement("a");
  link.href = highlight.url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = highlight.title || highlight.url;

  const date = document.createElement("span");
  date.textContent = new Date(highlight.dateCreated).toLocaleString();

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", async () => {
    deleteButton.disabled = true;
    await deleteHighlight(highlight.id);
    item.remove();
    toggleEmptyState();
  });

  meta.append(domain, link, date, deleteButton);
  item.append(text, meta);
  return item;
}

function toggleEmptyState(): void {
  emptyEl.style.display = listEl.childElementCount === 0 ? "block" : "none";
}

async function render(): Promise<void> {
  const highlights = await listHighlights();
  listEl.innerHTML = "";
  for (const highlight of highlights) {
    listEl.appendChild(renderItem(highlight));
  }
  toggleEmptyState();
}

void render();
