import type { Track } from "./types.js";

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

export interface DirectorySelectionResult {
  readonly canceled: boolean;
  readonly directoryPath: string | null;
}

export interface ArltHifiDesktopApi {
  readonly platform: DesktopPlatform;
  readonly selectMusicDirectory: () => Promise<DirectorySelectionResult>;
  readonly scanMusicDirectory: (directoryPath: string) => Promise<readonly Track[]>;
}

export const createTrackMediaUrl = (track: Track): string => {
  return `${mediaProtocolScheme}://audio/${encodeURIComponent(track.filePath)}`;
};

export const getSelectedDirectoryPath = (result: DirectorySelectionResult): string | null => {
  if (result.canceled) {
    return null;
  }

  return result.directoryPath;
};
