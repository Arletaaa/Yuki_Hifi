import type { PlaybackMode } from "@arlhifi/shared";

export interface NextTrackIndexInput {
  readonly currentIndex: number;
  readonly length: number;
  readonly mode: PlaybackMode;
  readonly random: () => number;
}

/**
 * 纯函数：计算下一首索引。
 * shuffle 目前保证「不连续重复」；完整的一轮不重复洗牌在 S4 队列重构中收口。
 */
export const getNextTrackIndex = ({ currentIndex, length, mode, random }: NextTrackIndexInput): number => {
  if (length <= 0) {
    return -1;
  }

  if (currentIndex < 0) {
    return 0;
  }

  if (mode === "repeat-one") {
    return currentIndex;
  }

  if (mode === "shuffle" && length > 1) {
    const stride = Math.floor(random() * (length - 1)) + 1;

    return (currentIndex + stride) % length;
  }

  return (currentIndex + 1) % length;
};

export const getPreviousTrackIndex = (currentIndex: number, length: number): number => {
  if (length <= 0) {
    return -1;
  }

  if (currentIndex < 0) {
    return 0;
  }

  return (currentIndex - 1 + length) % length;
};
