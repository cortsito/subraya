import { assignHighlightIdea, createIdea, deleteHighlight, deleteIdea, listHighlights, listIdeas } from "../storage/db";
import { countHighlightsByIdea } from "../shared/ideas";
import { PALETTE_HEX, type Highlight, type Idea } from "../shared/types";
import { filterHighlights, selectExportTargets } from "./filter";
import { buildMarkdownExport, exportFilename } from "./markdown";
import { pdfPageLabel } from "./sourceLabel";

const listEl = document.getElementById("list")!;
const emptyEl = document.getElementById("empty")!;
const searchInput = document.getElementById("search") as HTMLInputElement;
const resultCountEl = document.getElementById("result-count")!;
const exportButton = document.getElementById("export") as HTMLButtonElement;
const ideaChipsEl = document.getElementById("idea-chips")!;
const ideaCreateForm = document.getElementById("idea-create-form") as HTMLFormElement;
const newIdeaNameInput = document.getElementById("new-idea-name") as HTMLInputElement;

let allHighlights: Highlight[] = [];
let allIdeas: Idea[] = [];
let ideaFilter: string | null = null;

function currentQuery(): string {
  return searchInput.value;
}

function ideaNameById(ideaId: string | undefined): string | null {
  if (!ideaId) return null;
  return allIdeas.find((idea) => idea.id === ideaId)?.name ?? null;
}

function renderIdeaAssignSelect(highlight: Highlight): HTMLSelectElement {
  const select = document.createElement("select");
  select.className = "idea-assign-select";
  select.setAttribute("aria-label", "Assign to idea");

  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = "No Idea";
  select.appendChild(noneOption);

  for (const idea of allIdeas) {
    const opt = document.createElement("option");
    opt.value = idea.id;
    opt.textContent = idea.name;
    select.appendChild(opt);
  }

  select.value = highlight.ideaId ?? "";

  select.addEventListener("change", () => {
    void (async () => {
      const nextIdeaId = select.value || null;
      await assignHighlightIdea(highlight.id, nextIdeaId);
      highlight.ideaId = nextIdeaId ?? undefined;
      renderIdeaChips();
      renderList();
    })();
  });

  return select;
}

function renderItem(highlight: Highlight): HTMLElement {
  const item = document.createElement("div");
  item.className = "highlight-item";
  item.style.borderLeftColor = PALETTE_HEX[highlight.color];

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

  const ideaName = ideaNameById(highlight.ideaId);
  if (ideaName) {
    const ideaBadge = document.createElement("span");
    ideaBadge.className = "idea-badge";
    ideaBadge.textContent = ideaName;
    meta.append(ideaBadge);
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

  const ideaSelect = renderIdeaAssignSelect(highlight);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", async () => {
    deleteButton.disabled = true;
    await deleteHighlight(highlight.id);
    allHighlights = allHighlights.filter((h) => h.id !== highlight.id);
    renderIdeaChips();
    renderList();
  });

  meta.append(domain, link, date, ideaSelect, deleteButton);
  item.append(text, meta);
  return item;
}

function updateEmptyState(visibleCount: number, query: string): void {
  if (visibleCount > 0) {
    emptyEl.style.display = "none";
    return;
  }
  emptyEl.style.display = "block";
  if (allHighlights.length === 0) {
    emptyEl.textContent = "No highlights yet.";
  } else if (ideaFilter) {
    emptyEl.textContent = "No highlights in this idea.";
  } else if (query.trim()) {
    emptyEl.textContent = "No highlights match your search.";
  } else {
    emptyEl.textContent = "No highlights yet.";
  }
}

function updateResultCount(visibleCount: number, query: string): void {
  if (allHighlights.length === 0) {
    resultCountEl.textContent = "";
    return;
  }
  const noun = allHighlights.length === 1 ? "highlight" : "highlights";
  const isFiltered = Boolean(query.trim()) || Boolean(ideaFilter);
  resultCountEl.textContent = isFiltered
    ? `${visibleCount} of ${allHighlights.length} ${noun}`
    : `${allHighlights.length} ${noun}`;
}

function updateExportState(exportCount: number): void {
  exportButton.disabled = exportCount === 0;
  exportButton.title = exportCount === 0 ? "No highlights to export" : "";
}

function renderList(): void {
  const query = currentQuery();
  // Search stays independent of the Idea filter for export purposes — export
  // scope must keep matching the search box exactly, as it did before Ideas.
  const searchFiltered = filterHighlights(allHighlights, query);
  const visible = ideaFilter ? searchFiltered.filter((h) => h.ideaId === ideaFilter) : searchFiltered;

  listEl.innerHTML = "";
  for (const highlight of visible) {
    listEl.appendChild(renderItem(highlight));
  }

  updateEmptyState(visible.length, query);
  updateResultCount(visible.length, query);
  updateExportState(searchFiltered.length);
}

function renderIdeaChips(): void {
  ideaChipsEl.innerHTML = "";
  const counts = countHighlightsByIdea(allHighlights);

  const allChip = document.createElement("span");
  allChip.className = ideaFilter === null ? "idea-chip active" : "idea-chip";
  const allLabel = document.createElement("button");
  allLabel.type = "button";
  allLabel.className = "idea-chip-label";
  allLabel.textContent = `All (${allHighlights.length})`;
  allLabel.addEventListener("click", () => {
    ideaFilter = null;
    renderIdeaChips();
    renderList();
  });
  allChip.appendChild(allLabel);
  ideaChipsEl.appendChild(allChip);

  for (const idea of allIdeas) {
    const chip = document.createElement("span");
    chip.className = ideaFilter === idea.id ? "idea-chip active" : "idea-chip";

    const label = document.createElement("button");
    label.type = "button";
    label.className = "idea-chip-label";
    label.textContent = `${idea.name} (${counts.get(idea.id) ?? 0})`;
    label.addEventListener("click", () => {
      ideaFilter = ideaFilter === idea.id ? null : idea.id;
      renderIdeaChips();
      renderList();
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "idea-chip-delete";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `Delete idea ${idea.name}`);
    removeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      void (async () => {
        await deleteIdea(idea.id);
        allIdeas = allIdeas.filter((i) => i.id !== idea.id);
        for (const highlight of allHighlights) {
          if (highlight.ideaId === idea.id) highlight.ideaId = undefined;
        }
        if (ideaFilter === idea.id) ideaFilter = null;
        renderIdeaChips();
        renderList();
      })();
    });

    chip.append(label, removeButton);
    ideaChipsEl.appendChild(chip);
  }
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

ideaCreateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void (async () => {
    try {
      const idea = await createIdea(newIdeaNameInput.value);
      allIdeas = [idea, ...allIdeas];
      newIdeaNameInput.value = "";
      renderIdeaChips();
    } catch {
      // Empty/too-long names are rejected silently; the input keeps its value for correction.
    }
  })();
});

async function init(): Promise<void> {
  [allHighlights, allIdeas] = await Promise.all([listHighlights(), listIdeas()]);
  renderIdeaChips();
  renderList();
}

void init();
