import type { Highlight, NewHighlightInput } from "./types";

export interface SaveHighlightMessage {
  type: "SAVE_HIGHLIGHT";
  payload: NewHighlightInput;
}

export type SaveHighlightResponse =
  | { ok: true; highlight: Highlight }
  | { ok: false; error: string };

export interface ListHighlightsForUrlMessage {
  type: "LIST_HIGHLIGHTS_FOR_URL";
  url: string;
}

export type ListHighlightsForUrlResponse =
  | { ok: true; highlights: Highlight[] }
  | { ok: false; error: string };

export interface ContextMenuHighlightMessage {
  type: "CONTEXT_MENU_HIGHLIGHT";
}

export interface EnableInteractionMessage {
  type: "ENABLE_INTERACTION";
}

export type BackgroundMessage = SaveHighlightMessage | ListHighlightsForUrlMessage;
export type ContentMessage = ContextMenuHighlightMessage | EnableInteractionMessage;
