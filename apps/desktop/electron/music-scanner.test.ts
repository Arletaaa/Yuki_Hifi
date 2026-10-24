import { describe, expect, it } from "vitest";
import { createTrackFromFilePath, isSupportedAudioFile } from "./music-scanner.js";

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
  });
});
