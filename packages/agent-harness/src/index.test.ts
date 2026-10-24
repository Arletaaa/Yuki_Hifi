import { describe, it, expect } from "vitest";
import {
  agentHarnessName,
  karpathyConstraints,
  engineeringConstraints,
  agentConstraints,
} from "./index.js";

describe("agent harness identity", () => {
  it("exports a non-empty name", () => {
    expect(agentHarnessName).toBe("Arlt HiFi Agent Harness");
  });
});

describe("karpathy constraints", () => {
  it("contains all four principles", () => {
    expect(karpathyConstraints).toHaveLength(4);
    expect(karpathyConstraints[0]).toContain("Think");
    expect(karpathyConstraints[1]).toContain("Simplicity");
    expect(karpathyConstraints[2]).toContain("Surgical");
    expect(karpathyConstraints[3]).toContain("Goal-driven");
  });
});

describe("engineering constraints", () => {
  it("covers TypeScript, audio, and UI boundaries", () => {
    const joined = engineeringConstraints.join(" ");
    expect(joined).toMatch(/strict/);
    expect(joined).toMatch(/HTMLAudioElement/);
    expect(joined).toMatch(/audio-core/);
    expect(joined).toMatch(/right-side stage|visual stage/);
  });

  it("has at least 6 entries", () => {
    expect(engineeringConstraints.length).toBeGreaterThanOrEqual(6);
  });
});

describe("aggregate agent constraints", () => {
  it("merges karpathy and engineering constraints", () => {
    expect(agentConstraints).toEqual([
      ...karpathyConstraints,
      ...engineeringConstraints,
    ]);
  });

  it("all entries are read-only strings", () => {
    for (const c of agentConstraints) {
      expect(typeof c).toBe("string");
      expect(c.length).toBeGreaterThan(0);
    }
  });
});
