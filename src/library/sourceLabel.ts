import type { Highlight } from "../shared/types";

export function pdfPageLabel(highlight: Highlight): string | null {
  return highlight.sourceType === "pdf" ? `PDF · Page ${highlight.pdfPage}` : null;
}
