import type { PlaybackMode, Track } from "@arlhifi/shared";

export interface NextTrackIndexInput {
  readonly currentIndex: number;
  readonly length: number;
  readonly mode: PlaybackMode;
  readonly random: () => number;
}

/**
 * 纯函数：计算下一首索引。
 * shuffle 目前保证「不连续重复」；完整的一轮不重复洗牌在后续队列重构中收口。
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

/** 只保留仍存在于曲库中的队列项（换目录/刷新后调用）。 */
export const pruneQueueToLibrary = (queue: readonly Track[], library: readonly Track[]): readonly Track[] => {
  const libraryIds = new Set(library.map((track) => track.id));

  return queue.filter((track) => libraryIds.has(track.id));
};

/** 移除某一项后，接替它的下标（越界时取末尾）。 */
export const getReplacementIndex = (removedIndex: number, remainingLength: number): number => {
  if (remainingLength <= 0) {
    return -1;
  }

  return Math.min(Math.max(removedIndex, 0), remainingLength - 1);
};
