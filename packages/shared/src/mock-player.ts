import type { PlayerSnapshot } from "./types.js";

export const initialPlayerSnapshot: PlayerSnapshot = {
  library: [],
  status: "idle",
  currentTrack: null,
  queue: [],
  playbackMode: "sequential",
  volume: 72,
  positionSeconds: 0,
  durationSeconds: 0,
  playbackErrorMessage: null
};
