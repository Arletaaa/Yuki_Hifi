import { create } from "zustand";
import type { AppSettings, LibrarySortKey, MotionTier, ScenePreset, ThemeMode } from "@arlhifi/shared";
import { defaultScenePreset } from "@arlhifi/shared";

interface SettingsStore {
  readonly hydration: "pending" | "ready";
  readonly hydrate: (settings: AppSettings) => void;
  readonly librarySort: LibrarySortKey;
  readonly motionTier: MotionTier;
  readonly setLibrarySort: (librarySort: LibrarySortKey) => void;
  readonly setMotionTier: (motionTier: MotionTier) => void;
  readonly setTheme: (theme: ThemeMode) => void;
  readonly scenePreset: ScenePreset;
  readonly setScenePreset: (patch: Partial<ScenePreset>) => void;
  readonly theme: ThemeMode;
}

/**
 * 主题与动效档位。持久化交给主进程的 settings.json（见 use-settings-sync），
 * 这里不再使用 localStorage，避免两套存储互相覆盖。
 */
export const useSettingsStore = create<SettingsStore>()((set) => ({
  theme: "dark",
  motionTier: "standard",
  librarySort: "title",
  hydration: "pending",
  hydrate: (settings) => {
    set({
      theme: settings.theme,
      motionTier: settings.motionTier,
      librarySort: settings.librarySort,
      scenePreset: settings.scenePreset ?? defaultScenePreset,
      hydration: "ready"
    });
  },
  scenePreset: defaultScenePreset,
  setScenePreset: (patch) => {
    set((state) => ({ scenePreset: { ...state.scenePreset, ...patch } }));
  },
  setLibrarySort: (librarySort) => {
    set({ librarySort });
  },
  setTheme: (theme) => {
    set({ theme });
  },
  setMotionTier: (motionTier) => {
    set({ motionTier });
  }
}));
