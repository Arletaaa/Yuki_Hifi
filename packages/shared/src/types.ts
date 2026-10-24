export type AudioQuality = "unknown" | "lossless" | "lossy" | "hi-res";

export type PlaybackStatus = "idle" | "playing" | "paused";

export type PlaybackMode = "sequential" | "repeat-one" | "shuffle";

/** 曲目信息的来源：读取文件标签，或从文件名推断。 */
export type MetadataSource = "tags" | "filename";

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
  /** 已缓存的封面文件路径（S5 由标签解析填充），无封面为 null。 */
  readonly coverPath: string | null;
  readonly metadataSource: MetadataSource;
}

export interface PlayerSnapshot {
  readonly library: readonly Track[];
  readonly status: PlaybackStatus;
  readonly currentTrack: Track | null;
  readonly queue: readonly Track[];
  readonly favorites: readonly string[];
  readonly playbackMode: PlaybackMode;
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
