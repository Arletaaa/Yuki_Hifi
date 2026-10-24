import { describe, expect, it } from "vitest";
import { createTrackMediaUrl, getSelectedDirectoryPath } from "./desktop-api.js";

describe("desktop api helpers", () => {
  it("returns the selected directory path", () => {
    expect(getSelectedDirectoryPath({ canceled: false, directoryPath: "D:\\Music" })).toBe("D:\\Music");
  });

  it("ignores canceled directory selections", () => {
    expect(getSelectedDirectoryPath({ canceled: true, directoryPath: "D:\\Music" })).toBeNull();
  });

  it("creates a media URL without exposing file protocol URLs", () => {
    const url = createTrackMediaUrl({
      id: "track-1",
      title: "Track",
      artist: "Artist",
      album: "Album",
      durationSeconds: 0,
      quality: "unknown",
      sampleRateHz: 0,
      bitDepth: 0,
      filePath: "D:\\Music\\Track.mp3"
    });

    expect(url).toMatch(/^arlt-hifi-media:\/\/audio\//);
    expect(url).not.toContain("file://");
  });
});
