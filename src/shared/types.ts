export interface Anchor {
  exact: string;
  prefix: string;
  suffix: string;
  position: {
    start: number;
    end: number;
  };
}

export interface Highlight {
  id: string;
  text: string;
  sourceType: "web";
  url: string;
  title: string;
  domain: string;
  dateCreated: string;
  color: string;
  anchor: Anchor;
}

export type NewHighlightInput = Omit<Highlight, "id" | "dateCreated">;

export const DEFAULT_HIGHLIGHT_COLOR = "#ffe066";
