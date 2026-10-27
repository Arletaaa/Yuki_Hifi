import type { AppSettings, Track } from "./types.js";

export const mediaProtocolScheme = "arlt-hifi-media";

export type DesktopPlatform =
  | "aix"
  | "android"
  | "darwin"
  | "freebsd"
  | "haiku"
  | "linux"
  | "openbsd"
  | "sunos"
  | "win32"
  | "cygwin"
  | "netbsd";

export interface BackgroundImageSelectionResult {
  readonly canceled: boolean;
  readonly filePath: string | null;
}

export interface AudioFileSelectionResult {
  readonly canceled: boolean;
  readonly filePaths: readonly string[];
}

/** 单首曲目没进库的原因。 */
export type ImportSkipReason = "duplicate" | "unsupported" | "failed";

export interface ImportSkippedFile {
  readonly filePath: string;
  readonly reason: ImportSkipReason;
}

export interface LibraryImportResult {
  readonly imported: readonly Track[];
  readonly skipped: readonly ImportSkippedFile[];
}

export interface FolderImportResult extends LibraryImportResult {
  readonly canceled: boolean;
}

/** 导入进度（按已处理文件计数，包含被跳过的）。 */
export interface LibraryImportProgress {
  readonly completed: number;
  readonly total: number;
}

export interface ArltHifiDesktopApi {
  readonly platform: DesktopPlatform;
  /** 打开系统多选文件对话框，只选不复制。 */
  readonly selectAudioFiles: () => Promise<AudioFileSelectionResult>;
  /** 把选中的文件复制进 userData/library 并写库。 */
  readonly importAudioFiles: (filePaths: readonly string[]) => Promise<LibraryImportResult>;
  /** 打开系统文件夹对话框，递归导入其中受支持的音频。 */
  readonly importAudioFolder: () => Promise<FolderImportResult>;
  /** 读取已托管的曲库（manifest）。 */
  readonly loadLibrary: () => Promise<readonly Track[]>;
  /** 重命名副本文件与显示标题；id 不变。 */
  readonly renameTrack: (trackId: string, title: string) => Promise<Track>;
  /** 选择图片并写为该曲目的封面；取消返回 null。 */
  readonly setTrackCover: (trackId: string) => Promise<Track | null>;
  /** 删除副本文件并从曲库移除。 */
  readonly deleteTrack: (trackId: string) => Promise<boolean>;
  readonly onLibraryImportProgress: (handler: (progress: LibraryImportProgress) => void) => () => void;
  readonly selectBackgroundImage: () => Promise<BackgroundImageSelectionResult>;
  readonly loadSettings: () => Promise<AppSettings>;
  readonly saveSettings: (settings: AppSettings) => Promise<AppSettings>;
}

export const createTrackMediaUrl = (track: Track): string => {
  return `${mediaProtocolScheme}://audio/${encodeURIComponent(track.filePath)}`;
};

export const createCoverMediaUrl = (coverPath: string): string => {
  return `${mediaProtocolScheme}://image/${encodeURIComponent(coverPath)}`;
};

export const createBackgroundMediaUrl = (filePath: string): string => {
  return `${mediaProtocolScheme}://image/${encodeURIComponent(filePath)}`;
};
