import { describe, expect, it } from "vitest";
import { formatBitDepth, formatDuration, formatSampleRate, formatUnknown } from "./time.js";

describe("time utilities", () => {
  it("formats duration as minutes and seconds", () => {
    expect(formatDuration(246)).toBe("4:06");
  });

  it("formats long durations with hours", () => {
    expect(formatDuration(3725)).toBe("1:02:05");
  });

  it("clamps invalid duration values", () => {
    expect(formatDuration(-12)).toBe("0:00");
    expect(formatDuration(Number.NaN)).toBe("0:00");
  });

  it("formats sample rates for HiFi display", () => {
    expect(formatSampleRate(96000)).toBe("96 kHz");
    expect(formatSampleRate(44100)).toBe("44.1 kHz");
    expect(formatSampleRate(0)).toBe("—");
  });

  it("formats bit depth and unknown values", () => {
    expect(formatBitDepth(24)).toBe("24-bit");
    expect(formatBitDepth(0)).toBe("—");
    expect(formatUnknown("  ")).toBe("—");
    expect(formatUnknown("Album")).toBe("Album");
  });
});
