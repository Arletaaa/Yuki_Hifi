import { describe, expect, it } from "vitest";
import type { Track } from "@arlhifi/shared";
import { groupTracksForGallery } from "./album-groups";

const createTrack = (
  id: string,
  title: string,
  artist: string,
  album: string,
  coverPath: string | null = null
): Track => ({
  id,
  title,
  artist,
  album,
  durationSeconds: 100,
  quality: "lossless",
  sampleRateHz: 44100,
  bitDepth: 16,
  filePath: `D:\\Music\\${title}.flac`,
  coverPath,
  metadataSource: "tags"
});

describe("gallery grouping", () => {
  it("bundles tracks of the same album and artist into one slot", () => {
    const groups = groupTracksForGallery([
      createTrack("1", "A1", "Kaze", "Terrace EP"),
      createTrack("2", "A2", "Kaze", "Terrace EP"),
      createTrack("3", "B1", "Kaze", "Night Bus")
    ]);

    expect(groups).toHaveLength(2);
    const terrace = groups.find((group) => group.title === "Terrace EP");

    expect(terrace?.trackIds).toEqual(["1", "2"]);
    expect(terrace?.artist).toBe("Kaze");
  });

  it("falls back to grouping by artist when the album is unknown", () => {
    const groups = groupTracksForGallery([
      createTrack("1", "A1", "Kaze", "Unknown Album"),
      createTrack("2", "A2", "Kaze", "Unknown Album")
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.title).toBe("Kaze");
    expect(groups[0]?.trackIds).toEqual(["1", "2"]);
  });

  it("keeps tracks without any tags separate", () => {
    const groups = groupTracksForGallery([
      createTrack("1", "A1", "Unknown Artist", "Unknown Album"),
      createTrack("2", "A2", "Unknown Artist", "Unknown Album")
    ]);

    expect(groups).toHaveLength(2);
  });

  it("uses the first available cover inside a group", () => {
    const groups = groupTracksForGallery([
      createTrack("1", "A1", "Kaze", "Terrace EP", null),
      createTrack("2", "A2", "Kaze", "Terrace EP", "D:\\covers\\terrace.png")
    ]);

    expect(groups[0]?.coverPath).toBe("D:\\covers\\terrace.png");
  });

  it("sorts groups by title and keeps an empty library empty", () => {
    const groups = groupTracksForGallery([
      createTrack("1", "A1", "Kaze", "Zeta"),
      createTrack("2", "A2", "Kaze", "Alpha")
    ]);

    expect(groups.map((group) => group.title)).toEqual(["Alpha", "Zeta"]);
    expect(groupTracksForGallery([])).toEqual([]);
  });

  it("supports artist and manifest-order sorting", () => {
    const tracks = [
      createTrack("1", "A1", "Zeta", "First"),
      createTrack("2", "A2", "Alpha", "Second")
    ];

    expect(groupTracksForGallery(tracks, "imported").map((group) => group.title)).toEqual(["First", "Second"]);
    expect(groupTracksForGallery(tracks, "artist").map((group) => group.title)).toEqual(["Second", "First"]);
  });

  it("reports the summed album duration used by duration sorting", () => {
    const groups = groupTracksForGallery([
      createTrack("1", "A1", "Kaze", "Terrace EP"),
      createTrack("2", "A2", "Kaze", "Terrace EP")
    ]);

    expect(groups[0]?.durationSeconds).toBe(200);
  });
});
