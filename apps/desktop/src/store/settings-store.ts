import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "light";
export type MotionTier = "off" | "standard" | "rich";

interface SettingsStore {
  readonly motionTier: MotionTier;
  readonly setMotionTier: (motionTier: MotionTier) => void;
  readonly setTheme: (theme: ThemeMode) => void;
  readonly theme: ThemeMode;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: "dark",
      motionTier: "standard",
      setTheme: (theme) => {
        set({ theme });
      },
      setMotionTier: (motionTier) => {
        set({ motionTier });
      }
    }),
    { name: "arlt-hifi:settings" }
  )
);
