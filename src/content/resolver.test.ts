import { beforeEach, describe, expect, it } from "vitest";
import type { Anchor } from "../shared/types";
import { CONTEXT_CHARS, computeAnchor } from "./anchor";
import { resolveAnchor } from "./resolver";

describe("resolveAnchor", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("restores from an unchanged page using the saved position", () => {
    document.body.innerHTML =
      "<p>The quick brown fox jumps over the lazy dog near the riverbank.</p>";
    const textNode = document.querySelector("p")!.firstChild!;
    const full = textNode.textContent!;
    const start = full.indexOf("fox jumps");
    const end = start + "fox jumps".length;

    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    const anchor = computeAnchor(range);

    const resolved = resolveAnchor(anchor);
    expect(resolved).not.toBeNull();
    expect(resolved!.toString()).toBe("fox jumps");
  });

  it("restores after text is inserted before it, using the prefix/suffix fallback", () => {
    document.body.innerHTML = "<p>The quick brown fox jumps over the lazy dog.</p>";
    const paragraph = document.querySelector("p")!;
    const textNode = paragraph.firstChild!;
    const full = textNode.textContent!;
    const start = full.indexOf("lazy dog");
    const end = start + "lazy dog".length;

    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    const anchor = computeAnchor(range);

    // Simulate the page changing before reload: insert new text before the highlight.
    paragraph.prepend(document.createTextNode("Breaking news update! "));

    const resolved = resolveAnchor(anchor);
    expect(resolved).not.toBeNull();
    expect(resolved!.toString()).toBe("lazy dog");
  });

  it("resolves repeated exact text to the occurrence supported by surrounding context", () => {
    document.body.innerHTML = `
      <p>Alpha context hello world beta context.</p>
      <p>Gamma context hello world delta context.</p>
    `;
    const paragraphs = document.querySelectorAll("p");
    const fullText = document.body.textContent!;
    const needle = "hello world";
    const first = fullText.indexOf(needle);
    const second = fullText.indexOf(needle, first + 1);
    expect(second).toBeGreaterThan(first);

    const prefix = fullText.slice(Math.max(0, second - CONTEXT_CHARS), second);
    const suffix = fullText.slice(second + needle.length, second + needle.length + CONTEXT_CHARS);

    // Position is stale/wrong to force the resolver to fall back to context search.
    const anchor: Anchor = {
      exact: needle,
      prefix,
      suffix,
      position: { start: 0, end: needle.length },
    };

    const resolved = resolveAnchor(anchor);
    expect(resolved).not.toBeNull();
    expect(resolved!.toString()).toBe(needle);
    expect(resolved!.startContainer.parentElement).toBe(paragraphs[1]);
  });

  it("rebuilds a Range that spans multiple inline text nodes", () => {
    document.body.innerHTML = "<p>Hello <b>brave</b> new <i>world</i> today.</p>";
    const bold = document.querySelector("b")!.firstChild!;
    const italic = document.querySelector("i")!.firstChild!;

    const range = document.createRange();
    range.setStart(bold, 0);
    range.setEnd(italic, "world".length);
    const anchor = computeAnchor(range);

    expect(anchor.exact).toBe("brave new world");

    const resolved = resolveAnchor(anchor);
    expect(resolved).not.toBeNull();
    expect(resolved!.toString()).toBe("brave new world");
    expect(resolved!.startContainer).not.toBe(resolved!.endContainer);
    expect(resolved!.startContainer.parentElement?.tagName).toBe("B");
    expect(resolved!.endContainer.parentElement?.tagName).toBe("I");
  });

  it("returns no range when the match is ambiguous", () => {
    document.body.innerHTML = "<p>hello world one</p><p>hello world two</p>";

    const anchor: Anchor = {
      exact: "hello world",
      prefix: "definitely not the real prefix here",
      suffix: "definitely not the real suffix here",
      position: { start: 9999, end: 9999 + "hello world".length },
    };

    expect(resolveAnchor(anchor)).toBeNull();
  });
});
