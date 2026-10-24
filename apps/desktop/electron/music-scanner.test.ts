import { describe, expect, it } from "vitest";
import { createTrackFromFilePath, extractAudio, getCoverCachePath, isSupportedAudioFile, toTrack } from "./music-scanner.js";

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
        artist: "Aoi Kaze",
        bitDepth: 24,
        codec: "FLAC",
        durationSeconds: 214.6,
        picture: null,
        sampleRateHz: 96000,
        title: "Blue Hour"
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
        artist: "Artist",
        bitDepth: 16,
        codec: "FLAC",
        durationSeconds: 100,
        picture: null,
        sampleRateHz: 44100,
        title: "Song"
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
