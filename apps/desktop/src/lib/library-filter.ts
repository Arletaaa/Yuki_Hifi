import type { LibrarySortKey, Track } from "@arlhifi/shared";

export const librarySortOptions: readonly { readonly label: string; readonly value: LibrarySortKey }[] = [
  { value: "title", label: "标题" },
  { value: "artist", label: "艺术家" },
  { value: "duration", label: "时长" },
  { value: "imported", label: "导入时间" }
];

const matchesQuery = (track: Track, query: string): boolean => {
  const needle = query.trim().toLowerCase();

  if (needle.length === 0) {
    return true;
  }

  return [track.title, track.artist, track.album].some((value) => value.toLowerCase().includes(needle));
};

export const filterTracks = (tracks: readonly Track[], query: string): readonly Track[] =>
  tracks.filter((track) => matchesQuery(track, query));

const compareByTitle = (left: Track, right: Track): number => left.title.localeCompare(right.title);

/** 排序是纯函数；`imported` 直接保留输入顺序（曲库按 manifest 顺序排列）。 */
export const sortTracks = (tracks: readonly Track[], key: LibrarySortKey): readonly Track[] => {
  const sorted = [...tracks];

  switch (key) {
    case "artist":
      sorted.sort((left, right) => left.artist.localeCompare(right.artist) || compareByTitle(left, right));
      break;
    case "duration":
      sorted.sort((left, right) => left.durationSeconds - right.durationSeconds || compareByTitle(left, right));
      break;
    case "imported":
      break;
    case "title":
      sorted.sort(compareByTitle);
      break;
  }

  return sorted;
};
