import { create } from "zustand";
import type { AppSettings, MotionTier, ThemeMode } from "@arlhifi/shared";

interface SettingsStore {
  readonly hydration: "pending" | "ready";
  readonly hydrate: (settings: AppSettings) => void;
  readonly motionTier: MotionTier;
  readonly setMotionTier: (motionTier: MotionTier) => void;
  readonly setTheme: (theme: ThemeMode) => void;
  readonly theme: ThemeMode;
}

/**
 * 主题与动效档位。持久化交给主进程的 settings.json（见 use-settings-sync），
 * 这里不再使用 localStorage，避免两套存储互相覆盖。
 */
export const useSettingsStore = create<SettingsStore>()((set) => ({
  theme: "dark",
  motionTier: "standard",
  hydration: "pending",
  hydrate: (settings) => {
    set({ theme: settings.theme, motionTier: settings.motionTier, hydration: "ready" });
  },
  setTheme: (theme) => {
    set({ theme });
  },
  setMotionTier: (motionTier) => {
    set({ motionTier });
  }
}));
