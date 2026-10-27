import { describe, expect, it } from "vitest";
import { defaultAppSettings, defaultScenePreset } from "@arlhifi/shared";
import { mergeSettings } from "./settings-store.js";

describe("settings merging", () => {
  it("returns defaults for missing or invalid payloads", () => {
    expect(mergeSettings(null)).toEqual({ ...defaultAppSettings, favorites: [] });
    expect(mergeSettings("nope")).toEqual({ ...defaultAppSettings, favorites: [] });
  });

  it("keeps valid values", () => {
    const merged = mergeSettings({
      backgroundImagePath: "D:\\Pictures\\sky.png",
      favorites: ["a", "b"],
      librarySort: "duration",
      motionTier: "rich",
      theme: "light",
      volume: 55,
      wallpaperBlur: 4,
      wallpaperDim: 20
    });

    expect(merged).toEqual({
      backgroundImagePath: "D:\\Pictures\\sky.png",
      favorites: ["a", "b"],
      librarySort: "duration",
      motionTier: "rich",
      scenePreset: defaultScenePreset,
      theme: "light",
      volume: 55,
      wallpaperBlur: 4,
      wallpaperDim: 20
    });
  });

  it("clamps numeric ranges and drops unknown enums", () => {
    const merged = mergeSettings({
      librarySort: "bogus",
      motionTier: "insane",
      theme: "neon",
      volume: 400,
      wallpaperBlur: -5,
      wallpaperDim: 999
    });

    expect(merged.librarySort).toBe(defaultAppSettings.librarySort);
    expect(merged.theme).toBe(defaultAppSettings.theme);
    expect(merged.motionTier).toBe(defaultAppSettings.motionTier);
    expect(merged.volume).toBe(100);
    expect(merged.wallpaperBlur).toBe(0);
    expect(merged.wallpaperDim).toBe(60);
  });

  it("filters non-string favorites and empty paths", () => {
    const merged = mergeSettings({
      backgroundImagePath: "",
      favorites: ["a", 3, null, "b"]
    });

    expect(merged.favorites).toEqual(["a", "b"]);
    expect(merged.backgroundImagePath).toBeNull();
  });
});
