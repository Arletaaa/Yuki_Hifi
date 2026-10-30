import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectAudioFilePaths,
  createTrackFromFilePath,
  extractAudio,
  getCoverCachePath,
  isSupportedAudioFile,
  toTrack
} from "./music-scanner.js";

const tempDirectories: string[] = [];

const createTempDirectory = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "arlt-hifi-scanner-"));
  tempDirectories.push(directory);

  return directory;
};

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("music scanner helpers", () => {
  it("recognizes supported audio files case-insensitively", () => {
    expect(isSupportedAudioFile("D:\\Music\\Song.FLAC")).toBe(true);
    expect(isSupportedAudioFile("D:\\Music\\Song.mp3")).toBe(true);
    expect(isSupportedAudioFile("D:\\Music\\cover.jpg")).toBe(false);
  });

  it("creates a fallback track from a file path", () => {
    const track = createTrackFromFilePath("D:\\Music\\Album\\Blue Night.flac");

    expect(track.title).toBe("Blue Night");
    expect(track.artist).toBe("Unknown Artist");
    expect(track.album).toBe("Unknown Album");
    expect(track.quality).toBe("lossless");
    expect(track.filePath).toBe("D:\\Music\\Album\\Blue Night.flac");
    expect(track.metadataSource).toBe("filename");
    expect(track.coverPath).toBeNull();
  });
});

describe("tag extraction", () => {
  it("reads the fields we display", () => {
    const parsed = extractAudio({
      common: { title: " Blue Hour ", artist: "Aoi Kaze", album: "Terrace EP" },
      format: { duration: 214.4, sampleRate: 48000, bitsPerSample: 24, codec: "FLAC" }
    });

    expect(parsed.title).toBe("Blue Hour");
    expect(parsed.artist).toBe("Aoi Kaze");
    expect(parsed.album).toBe("Terrace EP");
    expect(parsed.durationSeconds).toBeCloseTo(214.4);
    expect(parsed.sampleRateHz).toBe(48000);
    expect(parsed.bitDepth).toBe(24);
    expect(parsed.codec).toBe("FLAC");
    expect(parsed.picture).toBeNull();
  });

  it("falls back to null for missing tags", () => {
    const parsed = extractAudio({ common: { title: "   " }, format: {} });

    expect(parsed.title).toBeNull();
    expect(parsed.artist).toBeNull();
    expect(parsed.durationSeconds).toBe(0);
    expect(parsed.sampleRateHz).toBe(0);
    expect(parsed.bitDepth).toBe(0);
  });
});

describe("track mapping", () => {
  it("uses tag metadata when available", () => {
    const track = toTrack(
      "D:\\Music\\Blue Hour.flac",
      {
        album: "Terrace EP",
        albumArtist: "Aoi Kaze",
        artist: "Aoi Kaze",
        bitDepth: 24,
        codec: "FLAC",
        discNumber: 1,
        durationSeconds: 214.6,
        picture: null,
        sampleRateHz: 96000,
        title: "Blue Hour",
        trackNumber: 3
      },
      "C:\\covers\\abc.jpg"
    );

    expect(track.title).toBe("Blue Hour");
    expect(track.artist).toBe("Aoi Kaze");
    expect(track.durationSeconds).toBe(215);
    expect(track.coverPath).toBe("C:\\covers\\abc.jpg");
    expect(track.metadataSource).toBe("tags");
    expect(track.quality).toBe("hi-res");
  });

  it("marks lossless files below hi-res thresholds as lossless", () => {
    const track = toTrack(
      "D:\\Music\\Song.flac",
      {
        album: "Album",
        albumArtist: null,
        artist: "Artist",
        bitDepth: 16,
        codec: "FLAC",
        discNumber: 1,
        durationSeconds: 100,
        picture: null,
        sampleRateHz: 44100,
        title: "Song",
        trackNumber: 1
      },
      null
    );

    expect(track.quality).toBe("lossless");
  });

  it("falls back to the filename when parsing failed", () => {
    const track = toTrack("D:\\Music\\Album\\Unknown Track.mp3", null, null);

    expect(track.title).toBe("Unknown Track");
    expect(track.metadataSource).toBe("filename");
    expect(track.quality).toBe("lossy");
  });
});

describe("cover cache paths", () => {
  it("is deterministic per source file and respects the image mime", () => {
    const first = getCoverCachePath("C:\\covers", "D:\\Music\\a.flac", "image/png");
    const second = getCoverCachePath("C:\\covers", "D:\\Music\\a.flac", "image/png");
    const jpeg = getCoverCachePath("C:\\covers", "D:\\Music\\a.flac", "image/jpeg");

    expect(first).toBe(second);
    expect(first.endsWith(".png")).toBe(true);
    expect(jpeg.endsWith(".jpg")).toBe(true);
    expect(first).not.toBe(jpeg);
  });
});

describe("collecting import candidates", () => {
  it("walks nested folders, keeps supported audio and ignores everything else", async () => {
    const directory = await createTempDirectory();
    const nested = join(directory, "Album", "Disc 1");

    await mkdir(nested, { recursive: true });
    await writeFile(join(directory, "root.flac"), "");
    await writeFile(join(directory, "cover.jpg"), "");
    await writeFile(join(directory, "notes.txt"), "");
    await writeFile(join(nested, "nested.MP3"), "");
    await writeFile(join(nested, "bonus.wav"), "");

    await expect(collectAudioFilePaths(directory)).resolves.toEqual([
      join(nested, "bonus.wav"),
      join(nested, "nested.MP3"),
      join(directory, "root.flac")
    ]);
  });

  it("returns an empty list for a folder without audio", async () => {
    const directory = await createTempDirectory();

    await expect(collectAudioFilePaths(directory)).resolves.toEqual([]);
  });
});
