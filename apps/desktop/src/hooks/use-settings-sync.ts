import { useEffect, useRef } from "react";
import type { AppSettings } from "@arlhifi/shared";
import { usePlayerStore } from "../store/player-store";
import { useSettingsStore } from "../store/settings-store";
import { useWallpaperStore } from "../store/wallpaper-store";

const SAVE_DEBOUNCE_MS = 400;

/** 把当前偏好写回 settings.json（防抖，且加载完成前不写）。 */
export const useSaveSettings = (musicDirectory: string | null): void => {
  const theme = useSettingsStore((state) => state.theme);
  const motionTier = useSettingsStore((state) => state.motionTier);
  const scenePreset = useSettingsStore((state) => state.scenePreset);
  const hydration = useSettingsStore((state) => state.hydration);
  const volume = usePlayerStore((state) => state.volume);
  const favorites = usePlayerStore((state) => state.favorites);
  const wallpaperPath = useWallpaperStore((state) => state.path);
  const wallpaperDim = useWallpaperStore((state) => state.dim);
  const wallpaperBlur = useWallpaperStore((state) => state.blur);
  const lastSaved = useRef<string | null>(null);

  useEffect(() => {
    const api = window.arltHifiDesktop;

    if (!api || hydration !== "ready") {
      return;
    }

    const settings: AppSettings = {
      backgroundImagePath: wallpaperPath,
      favorites,
      motionTier,
      scenePreset,
      musicDirectory,
      theme,
      volume,
      wallpaperBlur,
      wallpaperDim
    };
    const serialized = JSON.stringify(settings);

    if (serialized === lastSaved.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      lastSaved.current = serialized;
      void api.saveSettings(settings);
    }, SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [favorites, hydration, motionTier, musicDirectory, scenePreset, theme, volume, wallpaperBlur, wallpaperDim, wallpaperPath]);
};
