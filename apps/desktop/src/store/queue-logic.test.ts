import { describe, expect, it } from "vitest";
import { getNextTrackIndex, getPreviousTrackIndex } from "./queue-logic";

const firstOf = (randomValue: number) => () => randomValue;

describe("queue navigation", () => {
  it("advances and wraps in sequential mode", () => {
    expect(getNextTrackIndex({ currentIndex: 0, length: 3, mode: "sequential", random: firstOf(0.5) })).toBe(1);
    expect(getNextTrackIndex({ currentIndex: 2, length: 3, mode: "sequential", random: firstOf(0.5) })).toBe(0);
  });

  it("stays on the same track in repeat-one mode", () => {
    expect(getNextTrackIndex({ currentIndex: 1, length: 4, mode: "repeat-one", random: firstOf(0.5) })).toBe(1);
  });

  it("never repeats the current track in shuffle mode", () => {
    expect(getNextTrackIndex({ currentIndex: 1, length: 4, mode: "shuffle", random: firstOf(0) })).toBe(2);
    expect(getNextTrackIndex({ currentIndex: 1, length: 4, mode: "shuffle", random: firstOf(0.99) })).toBe(0);
  });

  it("starts at the first track when nothing is playing", () => {
    expect(getNextTrackIndex({ currentIndex: -1, length: 3, mode: "sequential", random: firstOf(0.5) })).toBe(0);
    expect(getPreviousTrackIndex(-1, 3)).toBe(0);
  });

  it("returns -1 for an empty queue", () => {
    expect(getNextTrackIndex({ currentIndex: 0, length: 0, mode: "sequential", random: firstOf(0.5) })).toBe(-1);
    expect(getPreviousTrackIndex(0, 0)).toBe(-1);
  });

  it("wraps backwards", () => {
    expect(getPreviousTrackIndex(0, 3)).toBe(2);
    expect(getPreviousTrackIndex(2, 3)).toBe(1);
  });
});
