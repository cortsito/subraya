import type { Anchor } from "../shared/types";

const CONTEXT_CHARS = 40;

export function isEditableTarget(node: Node): boolean {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  if (!element) return false;
  return element.closest("input, textarea, [contenteditable]") !== null;
}

export function computeAnchor(range: Range): Anchor {
  const exact = range.toString();

  const prefixRange = document.createRange();
  prefixRange.setStart(document.body, 0);
  prefixRange.setEnd(range.startContainer, range.startOffset);
  const fullPrefix = prefixRange.toString();

  const suffixRange = document.createRange();
  suffixRange.setStart(range.endContainer, range.endOffset);
  suffixRange.setEnd(document.body, document.body.childNodes.length);
  const fullSuffix = suffixRange.toString();

  const start = fullPrefix.length;
  const end = start + exact.length;

  return {
    exact,
    prefix: fullPrefix.slice(-CONTEXT_CHARS),
    suffix: fullSuffix.slice(0, CONTEXT_CHARS),
    position: { start, end },
  };
}
