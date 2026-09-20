import type { Highlight, NewHighlightInput } from "./types";

export interface SaveHighlightMessage {
  type: "SAVE_HIGHLIGHT";
  payload: NewHighlightInput;
}

export type SaveHighlightResponse =
  | { ok: true; highlight: Highlight }
  | { ok: false; error: string };

export interface ContextMenuHighlightMessage {
  type: "CONTEXT_MENU_HIGHLIGHT";
}

export type BackgroundMessage = SaveHighlightMessage;
export type ContentMessage = ContextMenuHighlightMessage;
