import { deleteHighlight, listHighlights } from "../storage/db";
import type { Highlight } from "../shared/types";
import { filterHighlights, selectExportTargets } from "./filter";
import { buildMarkdownExport, exportFilename } from "./markdown";
import { pdfPageLabel } from "./sourceLabel";

const listEl = document.getElementById("list")!;
const emptyEl = document.getElementById("empty")!;
const searchInput = document.getElementById("search") as HTMLInputElement;
const resultCountEl = document.getElementById("result-count")!;
const exportButton = document.getElementById("export") as HTMLButtonElement;

let allHighlights: Highlight[] = [];

function currentQuery(): string {
  return searchInput.value;
}

function renderItem(highlight: Highlight): HTMLElement {
  const item = document.createElement("div");
  item.className = "highlight-item";

  const text = document.createElement("p");
  text.className = "highlight-text";
  text.textContent = highlight.text;
  text.title = highlight.text;

  const meta = document.createElement("div");
  meta.className = "highlight-meta";

  const pageLabel = pdfPageLabel(highlight);
  if (pageLabel) {
    const badge = document.createElement("span");
    badge.textContent = pageLabel;
    meta.append(badge);
  }

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
    allHighlights = allHighlights.filter((h) => h.id !== highlight.id);
    renderList();
  });

  meta.append(domain, link, date, deleteButton);
  item.append(text, meta);
  return item;
}

function updateEmptyState(visibleCount: number, query: string): void {
  if (visibleCount > 0) {
    emptyEl.style.display = "none";
    return;
  }
  emptyEl.style.display = "block";
  emptyEl.textContent =
    allHighlights.length === 0
      ? "No highlights yet."
      : query.trim()
        ? "No highlights match your search."
        : "No highlights yet.";
}

function updateResultCount(visibleCount: number, query: string): void {
  if (allHighlights.length === 0) {
    resultCountEl.textContent = "";
    return;
  }
  const noun = allHighlights.length === 1 ? "highlight" : "highlights";
  resultCountEl.textContent = query.trim()
    ? `${visibleCount} of ${allHighlights.length} ${noun}`
    : `${allHighlights.length} ${noun}`;
}

function updateExportState(visibleCount: number): void {
  exportButton.disabled = visibleCount === 0;
  exportButton.title = visibleCount === 0 ? "No highlights to export" : "";
}

function renderList(): void {
  const query = currentQuery();
  const filtered = filterHighlights(allHighlights, query);

  listEl.innerHTML = "";
  for (const highlight of filtered) {
    listEl.appendChild(renderItem(highlight));
  }

  updateEmptyState(filtered.length, query);
  updateResultCount(filtered.length, query);
  updateExportState(filtered.length);
}

function exportMarkdown(): void {
  const targets = selectExportTargets(allHighlights, currentQuery());
  if (targets.length === 0) return;

  const markdown = buildMarkdownExport(targets);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = exportFilename();
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

searchInput.addEventListener("input", renderList);
exportButton.addEventListener("click", exportMarkdown);

async function init(): Promise<void> {
  allHighlights = await listHighlights();
  renderList();
}

void init();
