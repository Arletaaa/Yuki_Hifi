import type { Track } from "@arlhifi/shared";

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
