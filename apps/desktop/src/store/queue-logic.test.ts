import { describe, expect, it } from "vitest";
import type { Track } from "@arlhifi/shared";
import { getNextTrackIndex, getPreviousTrackIndex, getReplacementIndex, pruneQueueToLibrary } from "./queue-logic";

const firstOf = (randomValue: number) => () => randomValue;

const createTrack = (id: string): Track => ({
  id,
  title: id,
  artist: "Artist",
  album: "Album",
  durationSeconds: 100,
  quality: "unknown",
  sampleRateHz: 0,
  bitDepth: 0,
  filePath: `D:\\Music\\${id}.flac`,
  coverPath: null,
  metadataSource: "filename"
});

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

describe("queue pruning", () => {
  it("keeps only tracks that still exist in the library", () => {
    const queue = [createTrack("a"), createTrack("b"), createTrack("c")];
    const library = [createTrack("b"), createTrack("c")];

    expect(pruneQueueToLibrary(queue, library).map((track) => track.id)).toEqual(["b", "c"]);
  });

  it("returns an empty queue when the library is empty", () => {
    expect(pruneQueueToLibrary([createTrack("a")], [])).toEqual([]);
  });

  it("preserves queue order", () => {
    const queue = [createTrack("c"), createTrack("a"), createTrack("b")];
    const library = [createTrack("a"), createTrack("b"), createTrack("c")];

    expect(pruneQueueToLibrary(queue, library).map((track) => track.id)).toEqual(["c", "a", "b"]);
  });
});

describe("replacement index", () => {
  it("takes the same position after removal", () => {
    expect(getReplacementIndex(1, 3)).toBe(1);
  });

  it("falls back to the last item", () => {
    expect(getReplacementIndex(5, 2)).toBe(1);
  });

  it("returns -1 when nothing remains", () => {
    expect(getReplacementIndex(0, 0)).toBe(-1);
  });
});
