import { beforeEach, describe, expect, it } from "vitest";
import { computeAnchor, isEditableTarget } from "./anchor";

describe("isEditableTarget", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <p id="plain">Plain paragraph text.</p>
      <input id="input" value="hi" />
      <textarea id="textarea">hi</textarea>
      <div id="editable" contenteditable="true">edit me</div>
    `;
  });

  it("returns false for plain text nodes", () => {
    const node = document.getElementById("plain")!.firstChild!;
    expect(isEditableTarget(node)).toBe(false);
  });

  it("returns true for input elements", () => {
    expect(isEditableTarget(document.getElementById("input")!)).toBe(true);
  });

  it("returns true for textarea elements", () => {
    expect(isEditableTarget(document.getElementById("textarea")!)).toBe(true);
  });

  it("returns true for contenteditable descendants", () => {
    const node = document.getElementById("editable")!.firstChild!;
    expect(isEditableTarget(node)).toBe(true);
  });
});

describe("computeAnchor", () => {
  beforeEach(() => {
    document.body.innerHTML =
      "<p>The quick brown fox jumps over the lazy dog near the riverbank.</p>";
  });

  it("captures exact text, prefix, suffix, and position", () => {
    const textNode = document.querySelector("p")!.firstChild!;
    const full = textNode.textContent!;
    const start = full.indexOf("fox jumps");
    const end = start + "fox jumps".length;

    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);

    const anchor = computeAnchor(range);

    expect(anchor.exact).toBe("fox jumps");
    expect(anchor.prefix.endsWith("brown ")).toBe(true);
    expect(anchor.suffix.startsWith(" over")).toBe(true);
    expect(anchor.position).toEqual({ start, end });
  });

  it("scopes prefix/suffix/position to a given root, not the whole document", () => {
    // Simulates two PDF pages: identical text, but computeAnchor must only
    // ever see the one page passed as `root`.
    document.body.innerHTML = `
      <div id="page-1">Alpha beta gamma delta epsilon.</div>
      <div id="page-2">Alpha beta gamma delta epsilon.</div>
    `;
    const page2 = document.getElementById("page-2")!;
    const textNode = page2.firstChild!;
    const full = textNode.textContent!;
    const start = full.indexOf("gamma");
    const end = start + "gamma".length;

    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);

    const anchor = computeAnchor(range, page2);

    expect(anchor.exact).toBe("gamma");
    // Position is relative to page-2 alone, so it matches the local offset,
    // not the (much larger) offset it would have within document.body.
    expect(anchor.position).toEqual({ start, end });
    expect(anchor.prefix.endsWith("beta ")).toBe(true);
    expect(anchor.suffix.startsWith(" delta")).toBe(true);
  });
});
