export type AudioQuality = "unknown" | "lossless" | "lossy" | "hi-res";

export type PlaybackStatus = "idle" | "playing" | "paused";

export type PlaybackMode = "sequential" | "repeat-one" | "shuffle";

/** 曲目信息的来源：读取文件标签，或从文件名推断。 */
export type MetadataSource = "tags" | "filename";

export type ThemeMode = "dark" | "light";

export type MotionTier = "off" | "standard" | "rich";

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
  /** 已缓存的封面文件路径，无封面为 null。 */
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
  readonly muted: boolean;
  readonly positionSeconds: number;
  readonly durationSeconds: number;
  readonly playbackErrorMessage: string | null;
}

/** 持久化到 userData/settings.json 的全部偏好。 */
/** 场景预设：材质与光效的组合（见 docs/decisions/006-library-and-scene-presets.md）。 */
export interface ScenePreset {
  readonly base: string;
  readonly light: string;
  readonly silhouette: string;
  readonly table: string;
  readonly wall: string;
}

export const defaultScenePreset: ScenePreset = {
  table: "wood029",
  base: "wood002",
  wall: "fabric009",
  silhouette: "leafset015",
  light: "morning"
};

export interface AppSettings {
  readonly backgroundImagePath: string | null;
  readonly favorites: readonly string[];
  readonly motionTier: MotionTier;
  readonly musicDirectory: string | null;
  readonly theme: ThemeMode;
  readonly volume: number;
  readonly wallpaperBlur: number;
  readonly wallpaperDim: number;
  readonly scenePreset: ScenePreset;
}

export const defaultAppSettings: AppSettings = {
  backgroundImagePath: null,
  favorites: [],
  motionTier: "standard",
  musicDirectory: null,
  theme: "dark",
  volume: 72,
  wallpaperBlur: 2,
  wallpaperDim: 34,
  scenePreset: defaultScenePreset
};

export interface HifiSignalInfo {
  readonly codec: string;
  readonly sampleRateHz: number;
  readonly bitDepth: number;
  readonly outputDevice: string;
  readonly exclusiveMode: boolean;
}
