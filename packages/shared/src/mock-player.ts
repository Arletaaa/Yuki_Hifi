import type { HifiSignalInfo, PlayerSnapshot, Track } from "./types.js";

export const mockTrack: Track = {
  id: "mock-track-001",
  title: "Starlit Local Library",
  artist: "Arlt HiFi Lab",
  album: "First Stage Mock",
  durationSeconds: 246,
  quality: "hi-res",
  sampleRateHz: 96000,
  bitDepth: 24,
  filePath: "mock://starlit-local-library"
};

export const initialPlayerSnapshot: PlayerSnapshot = {
  library: [],
  status: "idle",
  currentTrack: null,
  queue: [mockTrack],
  volume: 72,
  positionSeconds: 0,
  durationSeconds: 0,
  playbackErrorMessage: null
};

export const mockHifiSignalInfo: HifiSignalInfo = {
  codec: "Mock PCM",
  sampleRateHz: 96000,
  bitDepth: 24,
  outputDevice: "Virtual HiFi Output",
  exclusiveMode: false
};
