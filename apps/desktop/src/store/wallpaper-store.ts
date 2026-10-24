import { create } from "zustand";

const MIN_DIM = 0;
const MAX_DIM = 60;
const MIN_BLUR = 0;
const MAX_BLUR = 12;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.round(value)));

interface WallpaperStore {
  readonly blur: number;
  readonly clearWallpaper: () => void;
  readonly dim: number;
  readonly setBlur: (blur: number) => void;
  readonly setDim: (dim: number) => void;
  readonly setWallpaper: (url: string) => void;
  readonly url: string | null;
}

/**
 * Session-only: the chosen wallpaper is not persisted yet (settings persistence lands in S5).
 */
export const useWallpaperStore = create<WallpaperStore>()((set) => ({
  url: null,
  dim: 34,
  blur: 2,
  setWallpaper: (url) => {
    set({ url });
  },
  clearWallpaper: () => {
    set({ url: null });
  },
  setDim: (dim) => {
    set({ dim: clamp(dim, MIN_DIM, MAX_DIM) });
  },
  setBlur: (blur) => {
    set({ blur: clamp(blur, MIN_BLUR, MAX_BLUR) });
  }
}));
