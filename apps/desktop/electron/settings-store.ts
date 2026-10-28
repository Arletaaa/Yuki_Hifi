import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { defaultAppSettings, defaultScenePreset, type AppSettings, type LibrarySortKey, type MotionTier, type PlaybackMode, type ScenePreset, type ThemeMode } from "@arlhifi/shared";

const settingsFileName = "settings.json";

const clampInt = (value: unknown, min: number, max: number, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.round(value)))
    : fallback;

const isThemeMode = (value: unknown): value is ThemeMode => value === "dark" || value === "light";

const isMotionTier = (value: unknown): value is MotionTier =>
  value === "off" || value === "standard" || value === "rich";

const isLibrarySortKey = (value: unknown): value is LibrarySortKey =>
  value === "title" || value === "artist" || value === "duration" || value === "imported";

const isPlaybackMode = (value: unknown): value is PlaybackMode =>
  value === "repeat-one" || value === "stop";

const readStringArray = (value: unknown): readonly string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

/** 把磁盘上的任意 JSON 收敛为合法设置（纯函数，可单测）。 */
const readPreset = (raw: unknown): ScenePreset => {
  const record = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const pick = (value: unknown, fallback: string): string =>
    typeof value === "string" && value.trim().length > 0 && value.length < 64 ? value : fallback;

  return {
    table: pick(record.table, defaultScenePreset.table),
    base: pick(record.base, defaultScenePreset.base),
    wall: pick(record.wall, defaultScenePreset.wall),
    light: pick(record.light, defaultScenePreset.light)
  };
};

export const mergeSettings = (raw: unknown): AppSettings => {
  if (typeof raw !== "object" || raw === null) {
    return { ...defaultAppSettings, favorites: [] };
  }

  const record = raw as Record<string, unknown>;

  return {
    favorites: readStringArray(record.favorites),
    librarySort: isLibrarySortKey(record.librarySort) ? record.librarySort : defaultAppSettings.librarySort,
    motionTier: isMotionTier(record.motionTier) ? record.motionTier : defaultAppSettings.motionTier,
    playbackMode: isPlaybackMode(record.playbackMode) ? record.playbackMode : defaultAppSettings.playbackMode,
    theme: isThemeMode(record.theme) ? record.theme : defaultAppSettings.theme,
    volume: clampInt(record.volume, 0, 100, defaultAppSettings.volume),
    scenePreset: readPreset(record.scenePreset)
  };
};

export const getSettingsFilePath = (userDataDirectory: string): string => join(userDataDirectory, settingsFileName);

export const readSettings = async (userDataDirectory: string): Promise<AppSettings> => {
  try {
    const contents = await readFile(getSettingsFilePath(userDataDirectory), "utf8");

    return mergeSettings(JSON.parse(contents));
  } catch {
    return { ...defaultAppSettings, favorites: [] };
  }
};

export const writeSettings = async (userDataDirectory: string, settings: AppSettings): Promise<void> => {
  const filePath = getSettingsFilePath(userDataDirectory);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
};
