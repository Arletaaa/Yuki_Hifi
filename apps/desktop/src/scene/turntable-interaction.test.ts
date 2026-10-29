import { describe, expect, it } from "vitest";
import {
  ARM_DROP_MAX,
  ARM_DROP_MIN,
  ARM_MAX_ANGLE,
  ARM_MIN_ANGLE,
  ARM_PLAY_ANGLE,
  LAMP_GREEN,
  LAMP_OFF,
  LAMP_RED,
  SPIN_DOWN_SECONDS,
  SPIN_UP_SECONDS,
  armAngleForDrag,
  clamp,
  leftLampColor,
  rightLampColor,
  shouldDropArm,
  spinRateAfter
} from "./turntable-interaction";

describe("turntable interaction", () => {
  it("clamps", () => {
    expect(clamp(2, 0, 1)).toBe(1);
    expect(clamp(-1, 0, 1)).toBe(0);
  });

  it("maps horizontal drag to arm angle and clamps", () => {
    expect(armAngleForDrag(0, 0)).toBe(0);
    expect(armAngleForDrag(0, -80)).toBeCloseTo((-80 * Math.PI) / 420);
    expect(armAngleForDrag(0, -4200)).toBeCloseTo(ARM_MIN_ANGLE);
    expect(armAngleForDrag(-Math.PI / 6, 4200)).toBe(ARM_MAX_ANGLE);
  });

  it("only drops the arm onto a seated CD inside the angle window", () => {
    expect(shouldDropArm(ARM_PLAY_ANGLE, true)).toBe(true);
    expect(shouldDropArm(ARM_DROP_MIN, true)).toBe(true);
    expect(shouldDropArm(ARM_DROP_MAX, true)).toBe(true);
    expect(shouldDropArm(ARM_DROP_MAX + 0.01, true)).toBe(false);
    expect(shouldDropArm(ARM_DROP_MIN - 0.01, true)).toBe(false);
    expect(shouldDropArm(ARM_PLAY_ANGLE, false)).toBe(false);
  });

  it("ramps the platter up and down over the configured durations", () => {
    let rate = 0;
    const steps = Math.ceil(SPIN_UP_SECONDS / 0.01);
    for (let i = 0; i < steps; i += 1) {
      rate = spinRateAfter(rate, 1, 0.01);
    }
    expect(rate).toBeCloseTo(1, 5);

    for (let t = 0; t < SPIN_DOWN_SECONDS; t += 0.01) {
      rate = spinRateAfter(rate, 0, 0.01);
    }
    expect(rate).toBeCloseTo(0, 5);
  });

  it("keeps the platter rate bounded", () => {
    expect(spinRateAfter(1, 1, 1)).toBe(1);
    expect(spinRateAfter(0, 0, 1)).toBe(0);
    expect(spinRateAfter(0, 1, 5)).toBe(1);
  });

  it("colors the two lamps", () => {
    expect(leftLampColor(false, false)).toBe(LAMP_OFF);
    expect(leftLampColor(false, true)).toBe(LAMP_OFF);
    expect(leftLampColor(true, false)).toBe(LAMP_RED);
    expect(leftLampColor(true, true)).toBe(LAMP_GREEN);
    expect(rightLampColor(false)).toBe(LAMP_OFF);
    expect(rightLampColor(true)).toBe(LAMP_GREEN);
  });
});
