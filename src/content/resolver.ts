import type { Anchor } from "../shared/types";
import { CONTEXT_CHARS } from "./anchor";

interface TextNodeSpan {
  node: Text;
  start: number;
  end: number;
}

interface TextIndex {
  text: string;
  nodes: TextNodeSpan[];
}

function buildTextIndex(root: Node): TextIndex {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: TextNodeSpan[] = [];
  let text = "";
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    if (textNode.data.length === 0) continue;
    const start = text.length;
    text += textNode.data;
    nodes.push({ node: textNode, start, end: text.length });
  }
  return { text, nodes };
}

// A boundary offset that falls exactly between two adjacent text nodes is
// ambiguous: (nodeA, nodeA.length) and (nodeB, 0) are equivalent DOM points.
// Start boundaries prefer the start of the following node; end boundaries
// prefer the end of the preceding node, since that anchors each boundary
// inside the node that actually contains the selected character.
function locateBoundary(
  nodes: TextNodeSpan[],
  pos: number,
  preferNodeEnd: boolean,
): { node: Text; offset: number } | null {
  if (preferNodeEnd) {
    for (const span of nodes) {
      if (pos === span.end) {
        return { node: span.node, offset: span.node.data.length };
      }
    }
  } else {
    for (const span of nodes) {
      if (pos === span.start) {
        return { node: span.node, offset: 0 };
      }
    }
  }

  for (const span of nodes) {
    if (pos > span.start && pos < span.end) {
      return { node: span.node, offset: pos - span.start };
    }
  }

  const last = nodes[nodes.length - 1];
  if (last && pos === last.end) {
    return { node: last.node, offset: last.node.data.length };
  }
  const first = nodes[0];
  if (first && pos === first.start) {
    return { node: first.node, offset: 0 };
  }
  return null;
}

function buildRange(index: TextIndex, start: number, end: number): Range | null {
  if (start < 0 || end > index.text.length || start >= end) return null;

  const startPoint = locateBoundary(index.nodes, start, false);
  const endPoint = locateBoundary(index.nodes, end, true);
  if (!startPoint || !endPoint) return null;

  const range = document.createRange();
  try {
    range.setStart(startPoint.node, startPoint.offset);
    range.setEnd(endPoint.node, endPoint.offset);
  } catch {
    return null;
  }
  return range;
}

function findAllOccurrences(haystack: string, needle: string): number[] {
  if (!needle) return [];
  const positions: number[] = [];
  let from = 0;
  while (from <= haystack.length) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) break;
    positions.push(idx);
    from = idx + 1;
  }
  return positions;
}

function contextScore(text: string, start: number, end: number, anchor: Anchor): number {
  const actualPrefix = text.slice(Math.max(0, start - CONTEXT_CHARS), start);
  const actualSuffix = text.slice(end, end + CONTEXT_CHARS);
  let score = 0;
  if (actualPrefix === anchor.prefix) score += 1;
  if (actualSuffix === anchor.suffix) score += 1;
  return score;
}

/**
 * Resolves a saved anchor to a live DOM Range in the current document, or
 * null when the match is missing or ambiguous. Never mutates the DOM.
 */
export function resolveAnchor(anchor: Anchor, root: Node = document.body): Range | null {
  const index = buildTextIndex(root);
  const { text } = index;

  const { start, end } = anchor.position;
  if (start >= 0 && end <= text.length && start < end && text.slice(start, end) === anchor.exact) {
    const range = buildRange(index, start, end);
    if (range) return range;
  }

  const occurrences = findAllOccurrences(text, anchor.exact);
  if (occurrences.length === 0) return null;

  if (occurrences.length === 1) {
    const [occStart] = occurrences;
    return buildRange(index, occStart, occStart + anchor.exact.length);
  }

  const scored = occurrences.map((occStart) => {
    const occEnd = occStart + anchor.exact.length;
    return {
      start: occStart,
      end: occEnd,
      score: contextScore(text, occStart, occEnd, anchor),
      distance: Math.abs(occStart - anchor.position.start),
    };
  });

  const maxScore = Math.max(...scored.map((c) => c.score));
  if (maxScore === 0) return null;

  const top = scored.filter((c) => c.score === maxScore);
  if (top.length === 1) {
    return buildRange(index, top[0].start, top[0].end);
  }

  const minDistance = Math.min(...top.map((c) => c.distance));
  const closest = top.filter((c) => c.distance === minDistance);
  if (closest.length !== 1) return null;

  return buildRange(index, closest[0].start, closest[0].end);
}
