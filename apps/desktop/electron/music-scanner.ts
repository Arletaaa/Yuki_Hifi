import { createHash } from "node:crypto";
import { access, mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { parseFile } from "music-metadata";
import { getAudioQuality, type AudioQuality, type Track } from "@arlhifi/shared";
import { isSupportedAudioFile } from "./media-access.js";

export { isSupportedAudioFile };

const HI_RES_RATE_HZ = 96000;
const HI_RES_BIT_DEPTH = 24;

/** music-metadata 结果中我们用到的字段子集，便于单测构造。 */
export interface AudioMetadataLike {
  readonly common: {
    readonly album?: string | undefined;
    readonly artist?: string | undefined;
    readonly picture?: readonly { readonly data: Uint8Array; readonly format: string }[] | undefined;
    readonly title?: string | undefined;
  };
  readonly format: {
    readonly bitsPerSample?: number | undefined;
    readonly codec?: string | undefined;
    readonly duration?: number | undefined;
    readonly sampleRate?: number | undefined;
  };
}

export interface ParsedAudio {
  readonly album: string | null;
  readonly artist: string | null;
  readonly bitDepth: number;
  readonly codec: string | null;
  readonly durationSeconds: number;
  readonly picture: { readonly data: Uint8Array; readonly mime: string } | null;
  readonly sampleRateHz: number;
  readonly title: string | null;
}

/** 从 music-metadata 结果中抽出我们需要的字段（纯函数）。 */
export const extractAudio = (metadata: AudioMetadataLike): ParsedAudio => {
  const picture = metadata.common.picture?.[0] ?? null;

  return {
    album: metadata.common.album?.trim() || null,
    artist: metadata.common.artist?.trim() || null,
    bitDepth: metadata.format.bitsPerSample ?? 0,
    codec: metadata.format.codec ?? null,
    durationSeconds: metadata.format.duration ?? 0,
    picture: picture ? { data: picture.data, mime: picture.format } : null,
    sampleRateHz: metadata.format.sampleRate ?? 0,
    title: metadata.common.title?.trim() || null
  };
};

const resolveQuality = (filePath: string, sampleRateHz: number, bitDepth: number): AudioQuality => {
  const base = getAudioQuality(filePath);

  if (base === "lossless" && (bitDepth >= HI_RES_BIT_DEPTH || sampleRateHz >= HI_RES_RATE_HZ)) {
    return "hi-res";
  }

  return base;
};

/** 文件名兜底曲目：读不到标签时使用。 */
export const createTrackFromFilePath = (filePath: string): Track => {
  const extension = extname(filePath).toLowerCase();
  const title = basename(filePath, extension).trim() || "Untitled";

  return {
    id: `file://${encodeURIComponent(filePath)}`,
    title,
    artist: "Unknown Artist",
    album: "Unknown Album",
    durationSeconds: 0,
    quality: getAudioQuality(filePath),
    sampleRateHz: 0,
    bitDepth: 0,
    filePath,
    coverPath: null,
    metadataSource: "filename"
  };
};

/** 把标签结果映射为曲目（纯函数，可单测）。 */
export const toTrack = (filePath: string, parsed: ParsedAudio | null, coverPath: string | null): Track => {
  const fallback = createTrackFromFilePath(filePath);

  if (!parsed) {
    return { ...fallback, coverPath };
  }

  const hasTags = Boolean(parsed.title ?? parsed.artist ?? parsed.album);

  return {
    ...fallback,
    title: parsed.title ?? fallback.title,
    artist: parsed.artist ?? fallback.artist,
    album: parsed.album ?? fallback.album,
    durationSeconds: Math.max(0, Math.round(parsed.durationSeconds)),
    sampleRateHz: parsed.sampleRateHz,
    bitDepth: parsed.bitDepth,
    quality: resolveQuality(filePath, parsed.sampleRateHz, parsed.bitDepth),
    coverPath,
    metadataSource: hasTags ? "tags" : "filename"
  };
};

const coverExtension = (mime: string): string => {
  const normalized = mime.toLowerCase();

  if (normalized.includes("png")) {
    return "png";
  }

  if (normalized.includes("webp")) {
    return "webp";
  }

  return "jpg";
};

/** 封面缓存按源文件路径哈希命名，同一曲目重扫不会产生新文件。 */
export const getCoverCachePath = (coversDirectory: string, filePath: string, mime: string): string => {
  const hash = createHash("sha1").update(filePath).digest("hex").slice(0, 16);

  return join(coversDirectory, `${hash}.${coverExtension(mime)}`);
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);

    return true;
  } catch {
    return false;
  }
};

const writeCover = async (
  coversDirectory: string | null,
  filePath: string,
  picture: ParsedAudio["picture"]
): Promise<string | null> => {
  if (!coversDirectory || !picture) {
    return null;
  }

  const coverPath = getCoverCachePath(coversDirectory, filePath, picture.mime);

  if (!(await fileExists(coverPath))) {
    await mkdir(coversDirectory, { recursive: true });
    await writeFile(coverPath, picture.data);
  }

  return coverPath;
};

const readTrack = async (filePath: string, coversDirectory: string | null): Promise<Track> => {
  try {
    const metadata = await parseFile(filePath, { duration: true });
    const parsed = extractAudio(metadata);
    const coverPath = await writeCover(coversDirectory, filePath, parsed.picture);

    return toTrack(filePath, parsed, coverPath);
  } catch {
    // 标签损坏或不可读：退回文件名，不阻断整次扫描。
    return toTrack(filePath, null, null);
  }
};

export interface ScanOptions {
  readonly concurrency?: number;
  readonly coversDirectory?: string | null;
}

export const scanMusicDirectory = async (
  directoryPath: string,
  options: ScanOptions = {}
): Promise<readonly Track[]> => {
  const audioFilePaths: string[] = [];

  const walk = async (currentDirectoryPath: string): Promise<void> => {
    const entries = await readdir(currentDirectoryPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = join(currentDirectoryPath, entry.name);

      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }

      if (entry.isFile() && isSupportedAudioFile(entryPath)) {
        audioFilePaths.push(entryPath);
      }
    }
  };

  await walk(directoryPath);

  const coversDirectory = options.coversDirectory ?? null;
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 8, 16));
  const tracks: Track[] = [];
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < audioFilePaths.length) {
      const index = cursor;
      cursor += 1;
      const filePath = audioFilePaths[index];

      if (!filePath) {
        continue;
      }

      tracks.push(await readTrack(filePath, coversDirectory));
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, audioFilePaths.length) }, worker));

  return tracks.sort((left, right) => left.title.localeCompare(right.title));
};
