import { assignIdea, normalizeIdeaName, sortIdeasByRecency, unassignHighlightsForIdea } from "../shared/ideas";
import {
  isValidNewHighlightInput,
  normalizePaletteColor,
  type Highlight,
  type Idea,
  type NewHighlightInput,
} from "../shared/types";

const DB_NAME = "subraya";
const DB_VERSION = 2;
const HIGHLIGHTS_STORE = "highlights";
const IDEAS_STORE = "ideas";

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(HIGHLIGHTS_STORE)) {
        db.createObjectStore(HIGHLIGHTS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(IDEAS_STORE)) {
        db.createObjectStore(IDEAS_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addHighlight(input: NewHighlightInput): Promise<Highlight> {
  if (!isValidNewHighlightInput(input)) {
    throw new Error("Invalid highlight input");
  }

  const highlight: Highlight = {
    ...input,
    color: normalizePaletteColor(input.color),
    id: crypto.randomUUID(),
    dateCreated: new Date().toISOString(),
  };

  const db = await openDb();
  try {
    const tx = db.transaction(HIGHLIGHTS_STORE, "readwrite");
    await promisifyRequest(tx.objectStore(HIGHLIGHTS_STORE).put(highlight));
    return highlight;
  } finally {
    db.close();
  }
}

export async function listHighlights(): Promise<Highlight[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(HIGHLIGHTS_STORE, "readonly");
    const all = (await promisifyRequest(tx.objectStore(HIGHLIGHTS_STORE).getAll())) as Highlight[];
    return all
      .map((highlight) => ({ ...highlight, color: normalizePaletteColor(highlight.color) }))
      .sort((a, b) => b.dateCreated.localeCompare(a.dateCreated));
  } finally {
    db.close();
  }
}

export async function listHighlightsForUrl(url: string): Promise<Highlight[]> {
  const all = await listHighlights();
  return all.filter((highlight) => highlight.url === url);
}

export async function deleteHighlight(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(HIGHLIGHTS_STORE, "readwrite");
    await promisifyRequest(tx.objectStore(HIGHLIGHTS_STORE).delete(id));
  } finally {
    db.close();
  }
}

export async function listIdeas(): Promise<Idea[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(IDEAS_STORE, "readonly");
    const all = (await promisifyRequest(tx.objectStore(IDEAS_STORE).getAll())) as Idea[];
    return sortIdeasByRecency(all);
  } finally {
    db.close();
  }
}

export async function createIdea(name: string): Promise<Idea> {
  const normalized = normalizeIdeaName(name);
  if (!normalized) {
    throw new Error("Invalid idea name");
  }

  const idea: Idea = {
    id: crypto.randomUUID(),
    name: normalized,
    createdAt: new Date().toISOString(),
  };

  const db = await openDb();
  try {
    const tx = db.transaction(IDEAS_STORE, "readwrite");
    await promisifyRequest(tx.objectStore(IDEAS_STORE).put(idea));
    return idea;
  } finally {
    db.close();
  }
}

/** Connects or disconnects a saved highlight to an Idea. `ideaId: null` removes any existing connection. */
export async function assignHighlightIdea(highlightId: string, ideaId: string | null): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(HIGHLIGHTS_STORE, "readwrite");
    const store = tx.objectStore(HIGHLIGHTS_STORE);
    const existing = (await promisifyRequest(store.get(highlightId))) as Highlight | undefined;
    if (!existing) return;
    await promisifyRequest(store.put(assignIdea(existing, ideaId)));
  } finally {
    db.close();
  }
}

/** Deletes an Idea and unassigns any highlights connected to it. The highlights themselves are never deleted. */
export async function deleteIdea(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction([HIGHLIGHTS_STORE, IDEAS_STORE], "readwrite");
    const highlightsStore = tx.objectStore(HIGHLIGHTS_STORE);
    const all = (await promisifyRequest(highlightsStore.getAll())) as Highlight[];
    const unassigned = unassignHighlightsForIdea(all, id);
    for (let i = 0; i < all.length; i++) {
      if (unassigned[i] !== all[i]) {
        await promisifyRequest(highlightsStore.put(unassigned[i]));
      }
    }
    await promisifyRequest(tx.objectStore(IDEAS_STORE).delete(id));
  } finally {
    db.close();
  }
}
