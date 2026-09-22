import type { Highlight, Idea, NewHighlightInput } from "./types";

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

export interface ListIdeasMessage {
  type: "LIST_IDEAS";
}

export type ListIdeasResponse = { ok: true; ideas: Idea[] } | { ok: false; error: string };

export interface CreateIdeaMessage {
  type: "CREATE_IDEA";
  name: string;
}

export type CreateIdeaResponse = { ok: true; idea: Idea } | { ok: false; error: string };

export interface ContextMenuHighlightMessage {
  type: "CONTEXT_MENU_HIGHLIGHT";
}

export interface EnableInteractionMessage {
  type: "ENABLE_INTERACTION";
}

export type BackgroundMessage =
  | SaveHighlightMessage
  | ListHighlightsForUrlMessage
  | ListIdeasMessage
  | CreateIdeaMessage;
export type ContentMessage = ContextMenuHighlightMessage | EnableInteractionMessage;
