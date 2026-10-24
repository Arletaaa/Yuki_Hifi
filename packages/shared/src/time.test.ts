import { describe, expect, it } from "vitest";
import { formatDuration, formatSampleRate } from "./time.js";

describe("time utilities", () => {
  it("formats duration as minutes and seconds", () => {
    expect(formatDuration(246)).toBe("4:06");
  });

  it("clamps negative duration values", () => {
    expect(formatDuration(-12)).toBe("0:00");
  });

  it("formats sample rates for HiFi display", () => {
    expect(formatSampleRate(96000)).toBe("96 kHz");
  });
});
