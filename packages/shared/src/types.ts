export type AudioQuality = "unknown" | "lossless" | "lossy" | "hi-res";

export type PlaybackStatus = "idle" | "playing" | "paused";

export type PlaybackMode = "repeat-one" | "stop";

/** 曲目信息的来源：读取文件标签，或从文件名推断。 */
export type MetadataSource = "tags" | "filename";

export type ThemeMode = "dark" | "light";

export type MotionTier = "off" | "standard" | "rich";

/** 曲库排序：标题 / 艺术家 / 时长 / 导入顺序（manifest 顺序）。 */
export type LibrarySortKey = "title" | "artist" | "duration" | "imported";

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
  readonly table: string;
  readonly wall: string;
}

export const defaultScenePreset: ScenePreset = {
  table: "wood029",
  base: "wood002",
  wall: "fabric009",
  light: "morning"
};

export interface AppSettings {
  readonly favorites: readonly string[];
  readonly librarySort: LibrarySortKey;
  readonly motionTier: MotionTier;
  readonly playbackMode: PlaybackMode;
  readonly theme: ThemeMode;
  readonly volume: number;
  readonly scenePreset: ScenePreset;
}

export const defaultAppSettings: AppSettings = {
  favorites: [],
  librarySort: "title",
  motionTier: "standard",
  playbackMode: "repeat-one",
  theme: "dark",
  volume: 72,
  scenePreset: defaultScenePreset
};
