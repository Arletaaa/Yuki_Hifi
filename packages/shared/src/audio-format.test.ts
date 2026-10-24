import { describe, expect, it } from "vitest";
import { getAudioFormatLabel, getAudioQuality, getFileExtension, getQualityLabel } from "./audio-format.js";

describe("audio format helpers", () => {
  it("extracts lowercase extensions", () => {
    expect(getFileExtension("D:\\Music\\Blue Night.FLAC")).toBe("flac");
    expect(getFileExtension("/home/music/track.mp3")).toBe("mp3");
    expect(getFileExtension("D:\\Music\\no-extension")).toBe("");
    expect(getFileExtension("D:\\Music.Name\\track")).toBe("");
  });

  it("derives a display format label", () => {
    expect(getAudioFormatLabel("D:\\Music\\a.flac")).toBe("FLAC");
    expect(getAudioFormatLabel("D:\\Music\\a.m4a")).toBe("M4A");
    expect(getAudioFormatLabel("D:\\Music\\a")).toBe("未知");
  });

  it("maps extensions to quality tiers", () => {
    expect(getAudioQuality("D:\\Music\\a.flac")).toBe("lossless");
    expect(getAudioQuality("D:\\Music\\a.wav")).toBe("lossless");
    expect(getAudioQuality("D:\\Music\\a.mp3")).toBe("lossy");
    expect(getAudioQuality("D:\\Music\\a.jpg")).toBe("unknown");
  });

  it("labels quality tiers for display", () => {
    expect(getQualityLabel("lossless")).toBe("Lossless");
    expect(getQualityLabel("lossy")).toBe("Lossy");
    expect(getQualityLabel("unknown")).toBe("Unknown");
  });
});
