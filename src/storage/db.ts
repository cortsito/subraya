import type { Highlight, NewHighlightInput } from "../shared/types";

const DB_NAME = "subraya";
const DB_VERSION = 1;
const STORE_NAME = "highlights";

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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addHighlight(input: NewHighlightInput): Promise<Highlight> {
  const highlight: Highlight = {
    ...input,
    id: crypto.randomUUID(),
    dateCreated: new Date().toISOString(),
  };

  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    await promisifyRequest(tx.objectStore(STORE_NAME).put(highlight));
    return highlight;
  } finally {
    db.close();
  }
}

export async function listHighlights(): Promise<Highlight[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, "readonly");
    const all = await promisifyRequest(tx.objectStore(STORE_NAME).getAll());
    return (all as Highlight[]).sort((a, b) => b.dateCreated.localeCompare(a.dateCreated));
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
    const tx = db.transaction(STORE_NAME, "readwrite");
    await promisifyRequest(tx.objectStore(STORE_NAME).delete(id));
  } finally {
    db.close();
  }
}
