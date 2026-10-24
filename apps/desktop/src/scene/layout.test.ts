import { describe, expect, it } from "vitest";
import { getBayCount, getGalleryAnchor, getSlotTransform, SLOTS_PER_BAY } from "./layout";

describe("gallery bay count", () => {
  it("keeps one bay for an empty library", () => {
    expect(getBayCount(0)).toBe(1);
    expect(getBayCount(-3)).toBe(1);
  });

  it("grows one bay per 24 tracks", () => {
    expect(getBayCount(1)).toBe(1);
    expect(getBayCount(23)).toBe(1);
    expect(getBayCount(24)).toBe(1);
    expect(getBayCount(25)).toBe(2);
    expect(getBayCount(47)).toBe(2);
    expect(getBayCount(48)).toBe(2);
    expect(getBayCount(49)).toBe(3);
    expect(getBayCount(240)).toBe(10);
  });
});

describe("gallery anchors", () => {
  it("maps the first bay from left to right, bottom to top", () => {
    expect(getGalleryAnchor(0)).toEqual({ bay: 0, side: "left", tier: 0, column: 0 });
    expect(getGalleryAnchor(3)).toEqual({ bay: 0, side: "left", tier: 0, column: 3 });
    expect(getGalleryAnchor(4)).toEqual({ bay: 0, side: "left", tier: 1, column: 0 });
    expect(getGalleryAnchor(12)).toEqual({ bay: 0, side: "right", tier: 0, column: 0 });
    expect(getGalleryAnchor(23)).toEqual({ bay: 0, side: "right", tier: 2, column: 3 });
  });

  it("starts a new bay exactly at the bay capacity", () => {
    expect(getGalleryAnchor(SLOTS_PER_BAY)).toEqual({ bay: 1, side: "left", tier: 0, column: 0 });
    expect(getGalleryAnchor(SLOTS_PER_BAY * 2 + 5)).toEqual({ bay: 2, side: "left", tier: 1, column: 1 });
  });

  it("clamps negative indexes", () => {
    expect(getGalleryAnchor(-10)).toEqual({ bay: 0, side: "left", tier: 0, column: 0 });
  });
});

describe("slot transforms", () => {
  it("alternates racks and moves down the corridor", () => {
    const first = getSlotTransform(0);
    const firstRight = getSlotTransform(12);
    const nextBay = getSlotTransform(SLOTS_PER_BAY);

    expect(first.position[0]).toBeLessThan(0);
    expect(firstRight.position[0]).toBeGreaterThan(0);
    expect(nextBay.position[2]).toBeLessThan(first.position[2]);
    expect(first.rotationY).toBeGreaterThan(0);
    expect(firstRight.rotationY).toBeLessThan(0);
  });

  it("keeps every tier inside a visible height band", () => {
    for (const index of [0, 4, 8]) {
      const y = getSlotTransform(index).position[1];
      expect(y).toBeGreaterThan(0.8);
      expect(y).toBeLessThan(2.2);
    }
  });
});
