import { describe, expect, it } from "vitest";
import { rangeKey } from "./dedupe";

describe("rangeKey", () => {
  it("joins start and end with a colon", () => {
    expect(rangeKey({ start: 10, end: 25 })).toBe("10:25");
  });

  it("produces distinct keys for distinct ranges", () => {
    expect(rangeKey({ start: 0, end: 5 })).not.toBe(rangeKey({ start: 0, end: 6 }));
  });

  it("produces the same key for the same range", () => {
    expect(rangeKey({ start: 3, end: 9 })).toBe(rangeKey({ start: 3, end: 9 }));
  });
});
