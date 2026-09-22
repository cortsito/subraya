import { afterEach, describe, expect, it, vi } from "vitest";
import { hideSelectionPopover, showSelectionPopover } from "./popover";
import type { Idea } from "../shared/types";

function makeIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: "idea-1",
    name: "Research thread",
    createdAt: "2026-09-20T10:30:00.000Z",
    ...overrides,
  };
}

function rect(): DOMRect {
  return {
    top: 100,
    bottom: 120,
    left: 50,
    right: 150,
    width: 100,
    height: 20,
    x: 50,
    y: 100,
    toJSON() {
      return {};
    },
  } as DOMRect;
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/** Waits for every pending promise chain (however deeply awaited) to settle. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function ideaSelectEl(): HTMLSelectElement {
  return document.querySelector<HTMLSelectElement>(".subraya-idea-select")!;
}

function newIdeaInputEl(): HTMLInputElement {
  return document.querySelector<HTMLInputElement>(".subraya-new-idea-row input")!;
}

function addButtonEl(): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(".subraya-add-idea-button")!;
}

function saveButtonEl(): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(".subraya-save-button")!;
}

function errorEl(): HTMLElement {
  return document.querySelector<HTMLElement>(".subraya-error")!;
}

function switchToNewIdeaMode(name: string): void {
  ideaSelectEl().value = "__new__";
  ideaSelectEl().dispatchEvent(new Event("change"));
  newIdeaInputEl().value = name;
}

afterEach(() => {
  hideSelectionPopover();
  document.body.innerHTML = "";
});

describe("showSelectionPopover — saving with a new Idea", () => {
  it("creates the Idea and saves the highlight with its real id, without ever clicking Add", async () => {
    const idea = makeIdea({ id: "idea-new" });
    const onCreateIdea = vi.fn().mockResolvedValue(idea);
    const onSave = vi.fn();

    showSelectionPopover({ rect: rect(), ideas: [], onSave, onCreateIdea });
    switchToNewIdeaMode("Research thread");
    saveButtonEl().click();
    await flush();

    expect(onCreateIdea).toHaveBeenCalledTimes(1);
    expect(onCreateIdea).toHaveBeenCalledWith("Research thread");
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(expect.any(String), "idea-new");
  });

  it("disables Save while an Add-triggered creation is in flight, then lets a real follow-up Save reuse the created Idea without creating a duplicate", async () => {
    const idea = makeIdea({ id: "idea-new" });
    const { promise, resolve } = deferred<Idea | null>();
    const onCreateIdea = vi.fn().mockReturnValue(promise);
    const onSave = vi.fn();

    showSelectionPopover({ rect: rect(), ideas: [], onSave, onCreateIdea });
    switchToNewIdeaMode("Research thread");
    addButtonEl().click();

    // While the creation request is in flight, Save is disabled — a real
    // click can't reach it, so this alone rules out a same-tick double-create.
    expect(saveButtonEl().disabled).toBe(true);

    resolve(idea);
    await flush();

    expect(onCreateIdea).toHaveBeenCalledTimes(1);
    expect(saveButtonEl().disabled).toBe(false);
    expect(ideaSelectEl().value).toBe("idea-new");

    saveButtonEl().click();
    await flush();

    expect(onCreateIdea).toHaveBeenCalledTimes(1); // still just once — no duplicate Idea
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(expect.any(String), "idea-new");
  });

  it("also dedupes when Save alone is clicked twice in the same tick from '+ New idea' mode", async () => {
    const idea = makeIdea({ id: "idea-new" });
    const { promise, resolve } = deferred<Idea | null>();
    const onCreateIdea = vi.fn().mockReturnValue(promise);
    const onSave = vi.fn();

    showSelectionPopover({ rect: rect(), ideas: [], onSave, onCreateIdea });
    switchToNewIdeaMode("Research thread");
    saveButtonEl().click();
    saveButtonEl().click(); // Save disables itself synchronously too, so this is a no-op click

    resolve(idea);
    await flush();

    expect(onCreateIdea).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(expect.any(String), "idea-new");
  });

  it("keeps the popover open and shows an error, without saving, when Idea creation fails", async () => {
    const onCreateIdea = vi.fn().mockResolvedValue(null);
    const onSave = vi.fn();

    showSelectionPopover({ rect: rect(), ideas: [], onSave, onCreateIdea });
    switchToNewIdeaMode("Research thread");
    saveButtonEl().click();
    await flush();

    expect(onSave).not.toHaveBeenCalled();
    expect(document.querySelector(".subraya-popover")).not.toBeNull();
    expect(errorEl().style.display).not.toBe("none");
    expect(saveButtonEl().disabled).toBe(false);
  });

  it("allows retrying and saving after a failed creation", async () => {
    const idea = makeIdea({ id: "idea-new" });
    const onCreateIdea = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(idea);
    const onSave = vi.fn();

    showSelectionPopover({ rect: rect(), ideas: [], onSave, onCreateIdea });
    switchToNewIdeaMode("Research thread");
    saveButtonEl().click();
    await flush();
    expect(onSave).not.toHaveBeenCalled();

    saveButtonEl().click();
    await flush();

    expect(onCreateIdea).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenCalledWith(expect.any(String), "idea-new");
  });
});

describe("showSelectionPopover — existing Idea and No Idea", () => {
  it("saves with the selected existing Idea's id, without creating a new one", async () => {
    const idea = makeIdea({ id: "idea-existing" });
    const onCreateIdea = vi.fn();
    const onSave = vi.fn();

    showSelectionPopover({ rect: rect(), ideas: [idea], onSave, onCreateIdea });
    ideaSelectEl().value = "idea-existing";
    saveButtonEl().click();
    await flush();

    expect(onCreateIdea).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith(expect.any(String), "idea-existing");
  });

  it("saves with a null ideaId when No Idea (the default) is kept selected", async () => {
    const onCreateIdea = vi.fn();
    const onSave = vi.fn();

    showSelectionPopover({ rect: rect(), ideas: [], onSave, onCreateIdea });
    saveButtonEl().click();
    await flush();

    expect(onCreateIdea).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith(expect.any(String), null);
  });
});

describe("showSelectionPopover — selectedIdeaId", () => {
  it("pre-selects the given Idea on open, so it stays selected across subsequent highlights", () => {
    const idea = makeIdea({ id: "idea-sticky" });
    showSelectionPopover({
      rect: rect(),
      ideas: [idea],
      selectedIdeaId: "idea-sticky",
      onSave: vi.fn(),
      onCreateIdea: vi.fn(),
    });

    expect(ideaSelectEl().value).toBe("idea-sticky");
  });
});
