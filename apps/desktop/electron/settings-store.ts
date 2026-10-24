import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { defaultAppSettings, type AppSettings, type MotionTier, type ThemeMode } from "@arlhifi/shared";

const settingsFileName = "settings.json";

const clampInt = (value: unknown, min: number, max: number, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.round(value)))
    : fallback;

const isThemeMode = (value: unknown): value is ThemeMode => value === "dark" || value === "light";

const isMotionTier = (value: unknown): value is MotionTier =>
  value === "off" || value === "standard" || value === "rich";

const readStringArray = (value: unknown): readonly string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

/** 把磁盘上的任意 JSON 收敛为合法设置（纯函数，可单测）。 */
export const mergeSettings = (raw: unknown): AppSettings => {
  if (typeof raw !== "object" || raw === null) {
    return { ...defaultAppSettings, favorites: [] };
  }

  const record = raw as Record<string, unknown>;

  return {
    backgroundImagePath:
      typeof record.backgroundImagePath === "string" && record.backgroundImagePath.length > 0
        ? record.backgroundImagePath
        : null,
    favorites: readStringArray(record.favorites),
    motionTier: isMotionTier(record.motionTier) ? record.motionTier : defaultAppSettings.motionTier,
    musicDirectory:
      typeof record.musicDirectory === "string" && record.musicDirectory.length > 0 ? record.musicDirectory : null,
    theme: isThemeMode(record.theme) ? record.theme : defaultAppSettings.theme,
    volume: clampInt(record.volume, 0, 100, defaultAppSettings.volume),
    wallpaperBlur: clampInt(record.wallpaperBlur, 0, 12, defaultAppSettings.wallpaperBlur),
    wallpaperDim: clampInt(record.wallpaperDim, 0, 60, defaultAppSettings.wallpaperDim)
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
