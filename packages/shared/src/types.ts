export type AudioQuality = "unknown" | "lossless" | "hi-res";

export type PlaybackStatus = "idle" | "playing" | "paused";

export interface Track {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly album: string;
  readonly durationSeconds: number;
  readonly quality: AudioQuality;
  readonly sampleRateHz: number;
  readonly bitDepth: number;
  readonly filePath: string;
}

export interface PlayerSnapshot {
  readonly library: readonly Track[];
  readonly status: PlaybackStatus;
  readonly currentTrack: Track | null;
  readonly queue: readonly Track[];
  readonly volume: number;
  readonly positionSeconds: number;
  readonly durationSeconds: number;
  readonly playbackErrorMessage: string | null;
}

export interface HifiSignalInfo {
  readonly codec: string;
  readonly sampleRateHz: number;
  readonly bitDepth: number;
  readonly outputDevice: string;
  readonly exclusiveMode: boolean;
}
