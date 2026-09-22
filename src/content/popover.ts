import { DEFAULT_PALETTE_COLOR, PALETTE_COLORS, PALETTE_HEX, PALETTE_LABELS, type Idea, type PaletteColor } from "../shared/types";

export const RECENT_IDEAS_LIMIT = 5;

const POPOVER_CLASS = "subraya-popover";
const STYLE_ID = "subraya-popover-styles";
const NEW_IDEA_VALUE = "__new__";
const VIEWPORT_MARGIN = 8;

export interface SelectionPopoverOptions {
  rect: DOMRect;
  ideas: Idea[];
  /** Pre-selects this Idea on open (e.g. the Idea most recently created in this session). Ignored if not present in `ideas`. */
  selectedIdeaId?: string | null;
  onSave: (color: PaletteColor, ideaId: string | null) => void;
  onCreateIdea: (name: string) => Promise<Idea | null>;
  onCancel?: () => void;
}

let currentPopover: HTMLDivElement | null = null;
let currentKeydownHandler: ((event: KeyboardEvent) => void) | null = null;

function injectPopoverStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${POPOVER_CLASS} {
      position: fixed;
      z-index: 2147483647;
      background: #fff;
      color: #1a1a1a;
      border-radius: 10px;
      padding: 12px;
      width: 240px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
      font: 13px/1.4 system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .${POPOVER_CLASS} .subraya-colors {
      display: flex;
      gap: 8px;
    }
    .${POPOVER_CLASS} .subraya-color-swatch {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      padding: 0;
    }
    .${POPOVER_CLASS} .subraya-color-swatch[aria-pressed="true"] {
      border-color: #1a1a1a;
    }
    .${POPOVER_CLASS} select,
    .${POPOVER_CLASS} input[type="text"] {
      font: inherit;
      padding: 6px 8px;
      border: 1px solid #ccc;
      border-radius: 6px;
      width: 100%;
      box-sizing: border-box;
    }
    .${POPOVER_CLASS} .subraya-new-idea-row {
      display: flex;
      gap: 6px;
    }
    .${POPOVER_CLASS} .subraya-new-idea-row input {
      flex: 1;
    }
    .${POPOVER_CLASS} button {
      font: inherit;
      cursor: pointer;
    }
    .${POPOVER_CLASS} .subraya-save-button {
      background: #1a1a1a;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 8px 12px;
    }
    .${POPOVER_CLASS} .subraya-save-button:hover {
      background: #333;
    }
    .${POPOVER_CLASS} .subraya-add-idea-button {
      background: #f0f0f0;
      border: 1px solid #ccc;
      border-radius: 6px;
      padding: 6px 10px;
      white-space: nowrap;
    }
    .${POPOVER_CLASS} button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .${POPOVER_CLASS} .subraya-error {
      margin: 0;
      color: #cc4444;
      font-size: 12px;
    }
  `;
  document.head.appendChild(style);
}

export function isPopoverTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(`.${POPOVER_CLASS}`) !== null;
}

export function hideSelectionPopover(): void {
  currentPopover?.remove();
  currentPopover = null;
  if (currentKeydownHandler) {
    document.removeEventListener("keydown", currentKeydownHandler, true);
    currentKeydownHandler = null;
  }
}

function clampToViewport(rect: DOMRect, width: number, height: number): { top: number; left: number } {
  const left = Math.min(Math.max(rect.left, VIEWPORT_MARGIN), window.innerWidth - width - VIEWPORT_MARGIN);
  let top = rect.bottom + VIEWPORT_MARGIN;
  if (top + height > window.innerHeight - VIEWPORT_MARGIN) {
    top = rect.top - height - VIEWPORT_MARGIN;
  }
  top = Math.min(Math.max(top, VIEWPORT_MARGIN), Math.max(window.innerHeight - height - VIEWPORT_MARGIN, VIEWPORT_MARGIN));
  return { top, left: Math.max(left, VIEWPORT_MARGIN) };
}

export function showSelectionPopover(options: SelectionPopoverOptions): void {
  hideSelectionPopover();
  injectPopoverStyles();

  const popover = document.createElement("div");
  popover.className = POPOVER_CLASS;
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-label", "Save highlight");

  let selectedColor: PaletteColor = DEFAULT_PALETTE_COLOR;

  const colorsRow = document.createElement("div");
  colorsRow.className = "subraya-colors";
  const swatchButtons = new Map<PaletteColor, HTMLButtonElement>();
  for (const color of PALETTE_COLORS) {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "subraya-color-swatch";
    swatch.style.background = PALETTE_HEX[color];
    swatch.setAttribute("aria-label", PALETTE_LABELS[color]);
    swatch.setAttribute("aria-pressed", String(color === selectedColor));
    swatch.addEventListener("mousedown", (event) => event.preventDefault());
    swatch.addEventListener("click", () => {
      selectedColor = color;
      for (const [c, btn] of swatchButtons) btn.setAttribute("aria-pressed", String(c === color));
    });
    swatchButtons.set(color, swatch);
    colorsRow.appendChild(swatch);
  }

  const ideaSelect = document.createElement("select");
  ideaSelect.className = "subraya-idea-select";
  ideaSelect.setAttribute("aria-label", "Idea");

  let knownIdeas = options.ideas;

  function renderIdeaOptions(selectedId: string | null): void {
    ideaSelect.innerHTML = "";

    const noneOption = document.createElement("option");
    noneOption.value = "";
    noneOption.textContent = "No Idea";
    ideaSelect.appendChild(noneOption);

    for (const idea of knownIdeas) {
      const opt = document.createElement("option");
      opt.value = idea.id;
      opt.textContent = idea.name;
      ideaSelect.appendChild(opt);
    }

    const newOption = document.createElement("option");
    newOption.value = NEW_IDEA_VALUE;
    newOption.textContent = "+ New idea…";
    ideaSelect.appendChild(newOption);

    ideaSelect.value = selectedId ?? "";
  }

  renderIdeaOptions(options.selectedIdeaId ?? null);

  const newIdeaRow = document.createElement("div");
  newIdeaRow.className = "subraya-new-idea-row";
  newIdeaRow.style.display = ideaSelect.value === NEW_IDEA_VALUE ? "flex" : "none";
  const newIdeaInput = document.createElement("input");
  newIdeaInput.type = "text";
  newIdeaInput.placeholder = "Idea name";
  newIdeaInput.maxLength = 80;
  const addIdeaButton = document.createElement("button");
  addIdeaButton.type = "button";
  addIdeaButton.className = "subraya-add-idea-button";
  addIdeaButton.textContent = "Add";
  newIdeaRow.append(newIdeaInput, addIdeaButton);

  const errorEl = document.createElement("p");
  errorEl.className = "subraya-error";
  errorEl.style.display = "none";
  errorEl.setAttribute("role", "alert");

  function showError(message: string): void {
    errorEl.textContent = message;
    errorEl.style.display = "block";
  }

  function clearError(): void {
    errorEl.style.display = "none";
    errorEl.textContent = "";
  }

  ideaSelect.addEventListener("change", () => {
    clearError();
    if (ideaSelect.value === NEW_IDEA_VALUE) {
      newIdeaRow.style.display = "flex";
      newIdeaInput.focus();
    } else {
      newIdeaRow.style.display = "none";
    }
  });

  function setBusy(busy: boolean): void {
    addIdeaButton.disabled = busy;
    saveButton.disabled = busy;
    newIdeaInput.disabled = busy;
  }

  // A single in-flight creation request, shared by the "Add" button and by
  // "Save" (when it's clicked while still in "+ New idea…" mode without
  // "Add" having been clicked first). Reusing the same promise — rather than
  // firing a second create request — is what keeps a fast Add-then-Save
  // click from creating the Idea twice.
  let pendingCreate: Promise<Idea | null> | null = null;

  async function createIdeaFromInput(): Promise<Idea | null> {
    clearError();
    if (!pendingCreate) {
      const name = newIdeaInput.value;
      setBusy(true);
      pendingCreate = options.onCreateIdea(name).finally(() => {
        pendingCreate = null;
        setBusy(false);
      });
    }

    const idea = await pendingCreate;
    if (!idea) {
      showError("Couldn't create idea. Try again.");
      return null;
    }
    if (!knownIdeas.some((existing) => existing.id === idea.id)) {
      knownIdeas = [idea, ...knownIdeas];
    }
    return idea;
  }

  addIdeaButton.addEventListener("mousedown", (event) => event.preventDefault());
  addIdeaButton.addEventListener("click", () => {
    void (async () => {
      const idea = await createIdeaFromInput();
      if (!idea) return;
      renderIdeaOptions(idea.id);
      newIdeaRow.style.display = "none";
      newIdeaInput.value = "";
    })();
  });
  newIdeaInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addIdeaButton.click();
    }
  });

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "subraya-save-button";
  saveButton.textContent = "Save highlight";
  saveButton.addEventListener("mousedown", (event) => event.preventDefault());
  saveButton.addEventListener("click", () => {
    void (async () => {
      // Saving directly from "+ New idea…" mode must create the Idea and use
      // its real id here — it must never rely on the separate "Add" button
      // having already run and updated `ideaSelect.value` first.
      if (ideaSelect.value === NEW_IDEA_VALUE) {
        const idea = await createIdeaFromInput();
        if (!idea) return; // Error shown; popover stays open so the user can retry.
        hideSelectionPopover();
        options.onSave(selectedColor, idea.id);
        return;
      }

      clearError();
      const ideaId = ideaSelect.value || null;
      hideSelectionPopover();
      options.onSave(selectedColor, ideaId);
    })();
  });

  popover.append(colorsRow, ideaSelect, newIdeaRow, errorEl, saveButton);

  // Positioned off-screen first so the initial size measurement below never flashes at (0, 0).
  popover.style.top = "-9999px";
  popover.style.left = "-9999px";
  document.body.appendChild(popover);
  currentPopover = popover;

  const { width, height } = popover.getBoundingClientRect();
  const { top, left } = clampToViewport(options.rect, width, height);
  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;

  currentKeydownHandler = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      hideSelectionPopover();
      options.onCancel?.();
    }
  };
  document.addEventListener("keydown", currentKeydownHandler, true);
}
