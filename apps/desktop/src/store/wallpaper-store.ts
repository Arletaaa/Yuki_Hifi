import { create } from "zustand";
import type { AppSettings } from "@arlhifi/shared";

const MIN_DIM = 0;
const MAX_DIM = 60;
const MIN_BLUR = 0;
const MAX_BLUR = 12;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.round(value)));

interface WallpaperStore {
  readonly blur: number;
  readonly dim: number;
  readonly hydrate: (settings: AppSettings) => void;
  /** 壁纸源文件路径；渲染层通过受控媒体协议转成 URL。 */
  readonly path: string | null;
  readonly reset: () => void;
  readonly setBlur: (blur: number) => void;
  readonly setDim: (dim: number) => void;
  readonly setPath: (path: string) => void;
}

export const useWallpaperStore = create<WallpaperStore>()((set) => ({
  path: null,
  dim: 34,
  blur: 2,
  hydrate: (settings) => {
    set({
      path: settings.backgroundImagePath,
      dim: settings.wallpaperDim,
      blur: settings.wallpaperBlur
    });
  },
  setPath: (path) => {
    set({ path });
  },
  reset: () => {
    set({ path: null });
  },
  setDim: (dim) => {
    set({ dim: clamp(dim, MIN_DIM, MAX_DIM) });
  },
  setBlur: (blur) => {
    set({ blur: clamp(blur, MIN_BLUR, MAX_BLUR) });
  }
}));
