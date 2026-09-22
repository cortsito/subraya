import { describe, expect, it } from "vitest";
import { cssHighlightNameForColor, PALETTE_HIGHLIGHT_NAMES } from "./highlightPainter";
import { PALETTE_COLORS } from "../shared/types";

describe("PALETTE_HIGHLIGHT_NAMES", () => {
  it("has exactly one fixed, distinct CSS highlight name per palette color", () => {
    const names = PALETTE_COLORS.map((color) => PALETTE_HIGHLIGHT_NAMES[color]);
    expect(names).toHaveLength(PALETTE_COLORS.length);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("cssHighlightNameForColor", () => {
  it("maps every valid palette color to its fixed CSS highlight name", () => {
    for (const color of PALETTE_COLORS) {
      expect(cssHighlightNameForColor(color)).toBe(PALETTE_HIGHLIGHT_NAMES[color]);
    }
  });

  it("never derives a name from arbitrary/untrusted input — falls back to the allowlisted default", () => {
    const allowedNames = new Set(Object.values(PALETTE_HIGHLIGHT_NAMES));

    expect(allowedNames.has(cssHighlightNameForColor("purple"))).toBe(true);
    expect(allowedNames.has(cssHighlightNameForColor("#ffe066"))).toBe(true);
    expect(allowedNames.has(cssHighlightNameForColor(undefined))).toBe(true);
    expect(allowedNames.has(cssHighlightNameForColor(null))).toBe(true);
    expect(allowedNames.has(cssHighlightNameForColor({ toString: () => "yellow" }))).toBe(true);

    // Malicious-shaped input must never leak into the returned name.
    const injected = "}; body { display: none";
    expect(cssHighlightNameForColor(injected)).not.toContain(injected);
    expect(allowedNames.has(cssHighlightNameForColor(injected))).toBe(true);
  });
});
