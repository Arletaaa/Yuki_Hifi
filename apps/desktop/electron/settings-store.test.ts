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
      favorites: ["a", "b"],
      librarySort: "duration",
      motionTier: "rich",
      theme: "light",
      volume: 55
    });

    expect(merged).toEqual({
      favorites: ["a", "b"],
      librarySort: "duration",
      motionTier: "rich",
      scenePreset: defaultScenePreset,
      theme: "light",
      volume: 55
    });
  });

  it("clamps numeric ranges and drops unknown enums", () => {
    const merged = mergeSettings({
      librarySort: "bogus",
      motionTier: "insane",
      theme: "neon",
      volume: 400
    });

    expect(merged.librarySort).toBe(defaultAppSettings.librarySort);
    expect(merged.theme).toBe(defaultAppSettings.theme);
    expect(merged.motionTier).toBe(defaultAppSettings.motionTier);
    expect(merged.volume).toBe(100);
  });

  it("filters non-string favorites", () => {
    const merged = mergeSettings({ favorites: ["a", 3, null, "b"] });

    expect(merged.favorites).toEqual(["a", "b"]);
  });
});
