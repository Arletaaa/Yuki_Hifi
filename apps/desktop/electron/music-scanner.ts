import { readdir } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import type { AudioQuality, Track } from "@arlhifi/shared";

const supportedAudioExtensions = new Set([".flac", ".wav", ".mp3", ".m4a", ".ogg"]);

export const isSupportedAudioFile = (filePath: string): boolean => {
  return supportedAudioExtensions.has(extname(filePath).toLowerCase());
};

export const createTrackFromFilePath = (filePath: string): Track => {
  const extension = extname(filePath).toLowerCase();
  const title = basename(filePath, extension).trim() || "Untitled";
  const quality: AudioQuality = extension === ".flac" || extension === ".wav" ? "lossless" : "unknown";

  return {
    id: `file://${encodeURIComponent(filePath)}`,
    title,
    artist: "Unknown Artist",
    album: "Unknown Album",
    durationSeconds: 0,
    quality,
    sampleRateHz: quality === "lossless" ? 44100 : 0,
    bitDepth: quality === "lossless" ? 16 : 0,
    filePath
  };
};

export const scanMusicDirectory = async (directoryPath: string): Promise<readonly Track[]> => {
  const tracks: Track[] = [];

  const scanDirectory = async (currentDirectoryPath: string): Promise<void> => {
    const entries = await readdir(currentDirectoryPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = join(currentDirectoryPath, entry.name);

      if (entry.isDirectory()) {
        await scanDirectory(entryPath);
        continue;
      }

      if (entry.isFile() && isSupportedAudioFile(entryPath)) {
        tracks.push(createTrackFromFilePath(entryPath));
      }
    }
  };

  await scanDirectory(directoryPath);

  return tracks.sort((left, right) => left.title.localeCompare(right.title));
};
