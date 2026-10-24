import type { PlayerSnapshot } from "./types.js";

export const initialPlayerSnapshot: PlayerSnapshot = {
  library: [],
  status: "idle",
  currentTrack: null,
  queue: [],
  favorites: [],
  playbackMode: "sequential",
  volume: 72,
  muted: false,
  positionSeconds: 0,
  durationSeconds: 0,
  playbackErrorMessage: null
};
