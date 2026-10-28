import { describe, expect, it } from "vitest";
import { clampVolume, volumeFromPointerAngle } from "./volume";

describe("volumeFromPointerAngle", () => {
  it("maps both ends of the arc", () => {
    expect(volumeFromPointerAngle(135)).toBe(0);
    expect(volumeFromPointerAngle(45)).toBe(100);
    expect(volumeFromPointerAngle(405)).toBe(100);
  });

  it("ignores the bottom gap instead of wrapping to 100", () => {
    expect(volumeFromPointerAngle(90)).toBeNull();
    expect(volumeFromPointerAngle(46)).toBeNull();
    expect(volumeFromPointerAngle(134)).toBeNull();
  });

  it("maps midpoints and negative angles", () => {
    expect(volumeFromPointerAngle(270)).toBe(50);
    expect(volumeFromPointerAngle(-90)).toBe(50);
    expect(volumeFromPointerAngle(0)).toBe(83);
    expect(volumeFromPointerAngle(360)).toBe(83);
  });

  it("supports a different arc start", () => {
    expect(volumeFromPointerAngle(0, 0, 270)).toBe(0);
    expect(volumeFromPointerAngle(270, 0, 270)).toBe(100);
    expect(volumeFromPointerAngle(315, 0, 270)).toBeNull();
  });
});

describe("clampVolume", () => {
  it("keeps 0 and clamps the ends", () => {
    expect(clampVolume(0)).toBe(0);
    expect(clampVolume(-4)).toBe(0);
    expect(clampVolume(120.7)).toBe(100);
    expect(clampVolume(42.4)).toBe(42);
  });
});
