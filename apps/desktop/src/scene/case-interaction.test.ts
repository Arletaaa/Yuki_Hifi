import { describe, expect, it } from "vitest";
import {
  DISC_ACCESS_ANGLE,
  DISC_DOWN_RANGE,
  DISC_LID_LIMIT,
  DISC_LIFT,
  DISC_RIGHT_RANGE,
  DISC_UP_RANGE,
  LID_MAX,
  canAccessDisc,
  clampDiscCenter,
  clampDiscOutsideCase,
  clampLidAngle,
  discBounds,
  isDiscTouchingCase,
  isNearHub,
  lidAngleForDrag,
  shouldLiftDisc,
  shouldSnapDisc,
  shouldStartDiscDrag,
  shouldStartLidDrag
} from "./case-interaction";

describe("lid interaction", () => {
  it("clamps the lid between 0 and 180 degrees", () => {
    expect(clampLidAngle(-1)).toBe(0);
    expect(clampLidAngle(0.5)).toBe(0.5);
    expect(clampLidAngle(Math.PI * 2)).toBe(LID_MAX);
  });

  it("opens when dragging left and closes when dragging right", () => {
    expect(lidAngleForDrag(0, -360)).toBeCloseTo(Math.PI);
    expect(lidAngleForDrag(Math.PI, 360)).toBeCloseTo(0);
    expect(lidAngleForDrag(0, 200)).toBe(0);
  });

  it("stops at 60 degrees while the disc edge still touches the case", () => {
    expect(lidAngleForDrag(Math.PI, 360, DISC_LID_LIMIT)).toBeCloseTo(DISC_LID_LIMIT);
    expect(lidAngleForDrag(Math.PI, 360, DISC_LID_LIMIT)).toBeGreaterThan(0);
    expect(lidAngleForDrag(Math.PI, 360)).toBeCloseTo(0);
    // 已经开够时仍可继续开盖，限制只挡合盖。
    expect(lidAngleForDrag(DISC_LID_LIMIT, -360, DISC_LID_LIMIT)).toBeCloseTo(LID_MAX);
  });

  it("detects case contact by the disc edge, not the disc center", () => {
    const area = { minX: -0.6, maxX: 0.6, minY: -0.6, maxY: 0.6 };
    const radius = 0.5;

    expect(isDiscTouchingCase(0, 0, radius, area)).toBe(true);
    // 盘心已经在盒外，但盘沿还搭在盒边。
    expect(isDiscTouchingCase(0.9, 0, radius, area)).toBe(true);
    expect(isDiscTouchingCase(1.1, 0, radius, area)).toBe(true);
    // 盘沿完全离开盒面。
    expect(isDiscTouchingCase(1.2, 0, radius, area)).toBe(false);
    expect(isDiscTouchingCase(0, -1.2, radius, area)).toBe(false);
  });

  it("pushes the disc out of the case when the lid is below the limit", () => {
    const area = { minX: -0.6, maxX: 0.6, minY: -0.6, maxY: 0.6 };
    const bounds = { minX: -2, maxX: 2, minY: -2, maxY: 2 };
    const radius = 0.5;

    const fromInside = clampDiscOutsideCase(0, 0, radius, area, bounds);
    expect(Math.abs(fromInside.x)).toBeCloseTo(1.1);
    expect(isDiscTouchingCase(fromInside.x, fromInside.y, radius, area)).toBe(true);

    const fromRight = clampDiscOutsideCase(0.9, 0, radius, area, bounds);
    expect(fromRight.x).toBeCloseTo(1.1);
    expect(isDiscTouchingCase(fromRight.x, fromRight.y, radius, area)).toBe(true);
  });

  it("only starts opening from the right half when closed", () => {
    expect(shouldStartLidDrag(0, false)).toBe(false);
    expect(shouldStartLidDrag(0, true)).toBe(true);
    expect(shouldStartLidDrag(1, false)).toBe(true);
  });
});

describe("disc interaction", () => {
  it("requires the lid to be open to 90 degrees", () => {
    expect(canAccessDisc(DISC_ACCESS_ANGLE - 0.01)).toBe(false);
    expect(canAccessDisc(DISC_ACCESS_ANGLE)).toBe(true);
    expect(shouldStartDiscDrag(false, false)).toBe(false);
    expect(shouldStartDiscDrag(false, true)).toBe(true);
  });

  it("keeps the disc to the right of the hinge with a safety margin", () => {
    const bounds = discBounds(-0.635, 0.058, 0, 0.538);
    const clamped = clampDiscCenter(-1, 0, bounds);

    expect(clamped.x).toBeCloseTo(-0.635 + 0.538 + 0.538 * 0.12);
    expect(clamped.x).toBeGreaterThan(-0.635);
    // The seated disc must still be inside the allowed region.
    expect(bounds.minX).toBeLessThan(0.058);
  });

  it("allows the disc across the screen right of the hinge", () => {
    const bounds = discBounds(-0.635, 0.058, 0, 0.538);

    expect(clampDiscCenter(0, -10, bounds).y).toBeCloseTo(-DISC_DOWN_RANGE);
    expect(clampDiscCenter(0, 10, bounds).y).toBeCloseTo(DISC_UP_RANGE);
    expect(clampDiscCenter(10, 0, bounds).x).toBeCloseTo(0.058 + DISC_RIGHT_RANGE);
  });

  it("snaps only inside 0.2 radius and only when the lid is open", () => {
    const radius = 0.538;

    expect(isNearHub(radius * 0.19, 0, radius)).toBe(true);
    expect(isNearHub(radius * 0.21, 0, radius)).toBe(false);
    expect(shouldSnapDisc(radius * 0.19, 0, radius, true)).toBe(true);
    expect(shouldSnapDisc(radius * 0.19, 0, radius, false)).toBe(false);
  });

  it("lifts on hover, while held, or while out of the tray", () => {
    const base = { canAccess: true, discHeld: false, discHovered: false, discOut: false, hoverLocked: false };

    expect(shouldLiftDisc({ ...base, discHovered: true })).toBe(true);
    expect(shouldLiftDisc({ ...base, discHovered: true, hoverLocked: true })).toBe(false);
    expect(shouldLiftDisc({ ...base, discHeld: true })).toBe(true);
    expect(shouldLiftDisc({ ...base, discOut: true })).toBe(true);
    expect(shouldLiftDisc({ ...base, discHovered: true, canAccess: false })).toBe(false);
    expect(DISC_LIFT).toBeGreaterThan(0);
  });
});
