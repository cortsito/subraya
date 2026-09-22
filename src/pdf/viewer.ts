import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Idea, NewHighlightInput, PaletteColor, PdfHighlight } from "../shared/types";
import { addHighlight, createIdea, listHighlightsForUrl, listIdeas } from "../storage/db";
import { computeAnchor, isEditableTarget } from "../content/anchor";
import { resolveAnchor } from "../content/resolver";
import { clearAll, paint } from "../content/highlightPainter";
import { hideSelectionPopover, isPopoverTarget, RECENT_IDEAS_LIMIT, showSelectionPopover } from "../content/popover";
import { injectStyles } from "../content/ui";
import { injectTextLayerStyles, PAGE_CLASS, TEXT_LAYER_CLASS } from "./textLayerStyles";

pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("pdf/pdf.worker.mjs");

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const DEFAULT_ZOOM_INDEX = 2; // 1.0 (100%)

const pagesEl = document.getElementById("pages")!;
const titleEl = document.getElementById("doc-title")!;
const pageCountEl = document.getElementById("page-count")!;
const statusEl = document.getElementById("status")!;
const zoomLevelEl = document.getElementById("zoom-level")!;
const zoomInButton = document.getElementById("zoom-in") as HTMLButtonElement;
const zoomOutButton = document.getElementById("zoom-out") as HTMLButtonElement;

interface PageEntry {
  pageNumber: number;
  container: HTMLDivElement;
  canvas: HTMLCanvasElement;
  textLayerEl: HTMLDivElement;
}

interface PendingSelection {
  range: Range;
  pageNumber: number;
  root: HTMLElement;
}

let doc: PDFDocumentProxy | null = null;
let originalUrl = "";
let docTitle = "";
let zoomIndex = DEFAULT_ZOOM_INDEX;
let pdfHighlights: PdfHighlight[] = [];
// Bumped whenever the current selection is invalidated, so an idea fetch that
// resolves after the user has already moved on doesn't pop open a stale popover.
let selectionGeneration = 0;
const pages: PageEntry[] = [];

function currentScale(): number {
  return ZOOM_STEPS[zoomIndex];
}

async function main(): Promise<void> {
  injectStyles();
  injectTextLayerStyles();

  if (!chrome.mimeHandler) {
    statusEl.textContent = "This page was not opened by Chrome as a PDF handler.";
    return;
  }

  const streamInfo = await chrome.mimeHandler.getStreamInfo();

  let url: URL;
  try {
    url = new URL(streamInfo.originalUrl);
  } catch {
    await chrome.mimeHandler.abortAndFallbackToNativeHandler();
    return;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    await chrome.mimeHandler.abortAndFallbackToNativeHandler();
    return;
  }
  originalUrl = streamInfo.originalUrl;

  let data: ArrayBuffer;
  try {
    const response = await fetch(streamInfo.streamUrl);
    data = await response.arrayBuffer();
  } catch {
    await chrome.mimeHandler.abortAndFallbackToNativeHandler();
    return;
  }

  const loadingTask = pdfjsLib.getDocument({ data });
  // v1 has no password UI: any protected document falls back to Chrome's viewer.
  loadingTask.onPassword = () => {
    void chrome.mimeHandler.abortAndFallbackToNativeHandler();
  };

  let loaded: PDFDocumentProxy;
  try {
    loaded = await loadingTask.promise;
  } catch {
    await chrome.mimeHandler.abortAndFallbackToNativeHandler();
    return;
  }

  // Heuristic for image-only/scanned PDFs: check page 1 only. A document with
  // a scanned cover page followed by real text would slip through this check;
  // acceptable for v1 (documented limitation), and it fails safely — no text
  // layer to highlight against, so nothing breaks, it's just non-obvious why.
  const firstPage = await loaded.getPage(1);
  const firstPageText = await firstPage.getTextContent();
  const hasText = firstPageText.items.some((item) => "str" in item && item.str.trim().length > 0);
  if (!hasText) {
    await chrome.mimeHandler.abortAndFallbackToNativeHandler();
    return;
  }

  doc = loaded;
  docTitle = await resolveTitle(loaded, originalUrl);
  document.title = docTitle;
  titleEl.textContent = docTitle;
  titleEl.title = docTitle;
  pageCountEl.textContent = loaded.numPages === 1 ? "1 page" : `${loaded.numPages} pages`;

  pdfHighlights = (await listHighlightsForUrl(originalUrl)).filter(
    (highlight): highlight is PdfHighlight => highlight.sourceType === "pdf",
  );

  await renderAllPages();
  wireZoomControls();
  wireHighlightInteraction();
}

async function resolveTitle(pdf: PDFDocumentProxy, url: string): Promise<string> {
  try {
    const meta = await pdf.getMetadata();
    const info = meta.info as { Title?: string };
    if (info.Title?.trim()) return info.Title.trim();
  } catch {
    // Fall through to a filename derived from the URL.
  }
  return pdfjsLib.getPdfFilenameFromUrl(url, url);
}

function createPageEntry(pageNumber: number): PageEntry {
  const container = document.createElement("div");
  container.className = PAGE_CLASS;
  container.dataset.page = String(pageNumber);

  const canvas = document.createElement("canvas");
  const textLayerEl = document.createElement("div");
  textLayerEl.className = TEXT_LAYER_CLASS;

  container.append(canvas, textLayerEl);
  return { pageNumber, container, canvas, textLayerEl };
}

async function renderPage(entry: PageEntry): Promise<void> {
  if (!doc) return;
  const page = await doc.getPage(entry.pageNumber);
  const viewport = page.getViewport({ scale: currentScale() });

  // TextLayer's own CSS (font-size, and setLayerDimensions()'s width/height
  // calc()) reads --total-scale-factor from the cascade. It must match the
  // same viewport used for the canvas, or the text layer stays laid out at
  // whatever scale it last inherited while the canvas visibly re-scales.
  entry.container.style.setProperty("--total-scale-factor", String(viewport.scale));

  entry.canvas.width = viewport.width;
  entry.canvas.height = viewport.height;
  entry.container.style.width = `${viewport.width}px`;
  entry.container.style.height = `${viewport.height}px`;

  await page.render({ canvas: entry.canvas, viewport }).promise;

  entry.textLayerEl.innerHTML = "";
  const textContent = await page.getTextContent();
  await new pdfjsLib.TextLayer({
    textContentSource: textContent,
    container: entry.textLayerEl,
    viewport,
  }).render();

  restoreHighlightsForPage(entry.pageNumber, entry.textLayerEl);
}

async function renderAllPages(): Promise<void> {
  if (!doc) return;
  pagesEl.innerHTML = "";
  pages.length = 0;

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const entry = createPageEntry(pageNumber);
    pages.push(entry);
    pagesEl.appendChild(entry.container);
    await renderPage(entry);
  }
}

function updateZoomUi(): void {
  zoomLevelEl.textContent = `${Math.round(currentScale() * 100)}%`;
  zoomOutButton.disabled = zoomIndex === 0;
  zoomInButton.disabled = zoomIndex === ZOOM_STEPS.length - 1;
}

async function changeZoom(direction: 1 | -1): Promise<void> {
  const nextIndex = zoomIndex + direction;
  if (nextIndex < 0 || nextIndex >= ZOOM_STEPS.length) return;

  zoomIndex = nextIndex;
  updateZoomUi();

  // Re-rendering replaces every page's canvas/text layer, invalidating any
  // Range objects already registered as CSS highlights. Clear first, then
  // restoreHighlightsForPage() (called from renderPage) repaints them against
  // the freshly built text layers.
  selectionGeneration++;
  hideSelectionPopover();
  clearAll();

  for (const entry of pages) {
    await renderPage(entry);
  }
}

function wireZoomControls(): void {
  updateZoomUi();
  zoomInButton.addEventListener("click", () => void changeZoom(1));
  zoomOutButton.addEventListener("click", () => void changeZoom(-1));
}

function pageElementOf(node: Node): HTMLElement | null {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return element?.closest<HTMLElement>(`.${PAGE_CLASS}`) ?? null;
}

function wireHighlightInteraction(): void {
  document.addEventListener("mouseup", handleSelectionChange);
  document.addEventListener("keyup", handleSelectionChange);
}

async function fetchRecentIdeas(): Promise<Idea[]> {
  try {
    return (await listIdeas()).slice(0, RECENT_IDEAS_LIMIT);
  } catch {
    return [];
  }
}

// The Idea most recently created from this popover, kept selected as the
// default for subsequent highlights in this session.
let lastCreatedIdea: Idea | null = null;

async function requestCreateIdea(name: string): Promise<Idea | null> {
  try {
    const idea = await createIdea(name);
    lastCreatedIdea = idea;
    return idea;
  } catch {
    return null;
  }
}

function withStickyIdea(ideas: Idea[]): Idea[] {
  if (!lastCreatedIdea) return ideas;
  if (ideas.some((idea) => idea.id === lastCreatedIdea!.id)) return ideas;
  return [lastCreatedIdea, ...ideas];
}

function openPopoverForSelection(pending: PendingSelection, rect: DOMRect): void {
  const myGeneration = ++selectionGeneration;
  void (async () => {
    const ideas = await fetchRecentIdeas();
    if (myGeneration !== selectionGeneration) return;
    showSelectionPopover({
      rect,
      ideas: withStickyIdea(ideas),
      selectedIdeaId: lastCreatedIdea?.id ?? null,
      onSave: (color, ideaId) => {
        void saveAndPaint(pending, color, ideaId);
      },
      onCreateIdea: requestCreateIdea,
    });
  })();
}

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

  // A selection must belong to exactly one page's text layer: our anchors are
  // page-relative, and a Range spanning two pages has no single valid root.
  const startPage = pageElementOf(liveRange.startContainer);
  const endPage = pageElementOf(liveRange.endContainer);
  const root = startPage?.querySelector<HTMLElement>(`.${TEXT_LAYER_CLASS}`);
  if (!startPage || startPage !== endPage || !root) {
    selectionGeneration++;
    hideSelectionPopover();
    return;
  }

  const pageNumber = Number(startPage.dataset.page);
  const range = liveRange.cloneRange();
  const rect = range.getBoundingClientRect();
  openPopoverForSelection({ range, pageNumber, root }, rect);
}

async function saveAndPaint(pending: PendingSelection, color: PaletteColor, ideaId: string | null): Promise<void> {
  const anchor = computeAnchor(pending.range, pending.root);

  const input: NewHighlightInput = {
    text: anchor.exact,
    sourceType: "pdf",
    url: originalUrl,
    title: docTitle,
    domain: new URL(originalUrl).hostname,
    color,
    anchor,
    pdfPage: pending.pageNumber,
    ...(ideaId ? { ideaId } : {}),
  };

  try {
    const saved = await addHighlight(input);
    if (saved.sourceType === "pdf") {
      pdfHighlights.push(saved);
    }
    paint(saved.id, pending.range, color);
  } catch (err) {
    console.warn("Subraya: failed to save PDF highlight", err);
  }
}

function restoreHighlightsForPage(pageNumber: number, root: HTMLElement): void {
  for (const highlight of pdfHighlights) {
    if (highlight.pdfPage !== pageNumber) continue;
    const range = resolveAnchor(highlight.anchor, root);
    if (!range) continue;
    paint(highlight.id, range, highlight.color);
  }
}

void main();
