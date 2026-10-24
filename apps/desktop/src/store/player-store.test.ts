import { describe, expect, it } from "vitest";
import { mockTrack, type Track } from "@arlhifi/shared";
import { createInitialPlayerState, createPlayerStore } from "./player-store";

const createTrack = (id: string, title: string): Track => ({
  id,
  title,
  artist: "Test Artist",
  album: "Test Album",
  durationSeconds: 120,
  quality: "unknown",
  sampleRateHz: 0,
  bitDepth: 0,
  filePath: `D:\\Music\\${title}.mp3`
});

describe("player store initial state", () => {
  it("starts idle with an empty library and a mock queue", () => {
    const state = createInitialPlayerState();

    expect(state.library).toHaveLength(0);
    expect(state.status).toBe("idle");
    expect(state.currentTrack).toBeNull();
    expect(state.queue).toHaveLength(1);
  });

  it("clones collections for each initial state", () => {
    const first = createInitialPlayerState();
    const second = createInitialPlayerState();

    expect(first.library).not.toBe(second.library);
    expect(first.queue).not.toBe(second.queue);
  });
});

describe("player store actions", () => {
  it("loads a scanned library into library and queue", () => {
    const store = createPlayerStore();
    const tracks = [createTrack("track-1", "First"), createTrack("track-2", "Second")];

    store.getState().loadLibrary(tracks);

    expect(store.getState().library).toEqual(tracks);
    expect(store.getState().queue).toEqual(tracks);
    expect(store.getState().currentTrack).toBeNull();
    expect(store.getState().status).toBe("idle");
  });

  it("keeps the mock queue as fallback when loading an empty library", () => {
    const store = createPlayerStore();

    store.getState().loadLibrary([]);

    expect(store.getState().library).toHaveLength(0);
    expect(store.getState().queue).toEqual([mockTrack]);
  });

  it("plays a selected track from the library", () => {
    const store = createPlayerStore();
    const track = createTrack("track-1", "First");

    store.getState().loadLibrary([track]);
    store.getState().playTrack(track);

    expect(store.getState().currentTrack).toEqual(track);
    expect(store.getState().status).toBe("playing");
    expect(store.getState().positionSeconds).toBe(0);
  });

  it("toggles playback using the first queued track when none is selected", () => {
    const store = createPlayerStore();
    const track = createTrack("track-1", "First");

    store.getState().loadLibrary([track]);
    store.getState().togglePlayback();

    expect(store.getState().currentTrack).toEqual(track);
    expect(store.getState().status).toBe("playing");

    store.getState().togglePlayback();

    expect(store.getState().status).toBe("paused");
  });

  it("moves to next and previous tracks in the queue", () => {
    const store = createPlayerStore();
    const first = createTrack("track-1", "First");
    const second = createTrack("track-2", "Second");
    const third = createTrack("track-3", "Third");

    store.getState().loadLibrary([first, second, third]);
    store.getState().playTrack(second);
    store.getState().playNext();

    expect(store.getState().currentTrack).toEqual(third);

    store.getState().playPrevious();

    expect(store.getState().currentTrack).toEqual(second);
  });

  it("wraps next and previous navigation", () => {
    const store = createPlayerStore();
    const first = createTrack("track-1", "First");
    const second = createTrack("track-2", "Second");

    store.getState().loadLibrary([first, second]);
    store.getState().playTrack(second);
    store.getState().playNext();

    expect(store.getState().currentTrack).toEqual(first);

    store.getState().playPrevious();

    expect(store.getState().currentTrack).toEqual(second);
  });

  it("clamps volume", () => {
    const store = createPlayerStore();

    store.getState().setVolume(120.7);
    expect(store.getState().volume).toBe(100);

    store.getState().setVolume(-4);
    expect(store.getState().volume).toBe(0);
  });

  it("syncs playback position and duration from the audio element", () => {
    const store = createPlayerStore();

    store.getState().setPositionSeconds(42.8);
    store.getState().setDurationSeconds(125.2);

    expect(store.getState().positionSeconds).toBe(42);
    expect(store.getState().durationSeconds).toBe(125);
  });

  it("tracks playback start, pause, and errors", () => {
    const store = createPlayerStore();
    const track = createTrack("track-1", "First");

    store.getState().playTrack(track);
    store.getState().setPlaybackError("Unsupported format");

    expect(store.getState().playbackErrorMessage).toBe("Unsupported format");
    expect(store.getState().status).toBe("paused");

    store.getState().markPlaybackStarted();

    expect(store.getState().playbackErrorMessage).toBeNull();
    expect(store.getState().status).toBe("playing");

    store.getState().markPlaybackPaused();

    expect(store.getState().status).toBe("paused");
  });
});
