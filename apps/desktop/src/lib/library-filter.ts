import type { Track } from "@arlhifi/shared";
import { getAudioFormatLabel } from "@arlhifi/shared";

export type LibrarySortKey = "title" | "artist" | "duration" | "format";

export const librarySortOptions: readonly { readonly label: string; readonly value: LibrarySortKey }[] = [
  { value: "title", label: "标题" },
  { value: "artist", label: "艺术家" },
  { value: "duration", label: "时长" },
  { value: "format", label: "格式" }
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

export const sortTracks = (tracks: readonly Track[], key: LibrarySortKey): readonly Track[] => {
  const sorted = [...tracks];

  switch (key) {
    case "artist":
      sorted.sort((left, right) => left.artist.localeCompare(right.artist) || compareByTitle(left, right));
      break;
    case "duration":
      sorted.sort((left, right) => left.durationSeconds - right.durationSeconds || compareByTitle(left, right));
      break;
    case "format":
      sorted.sort(
        (left, right) =>
          getAudioFormatLabel(left.filePath).localeCompare(getAudioFormatLabel(right.filePath)) ||
          compareByTitle(left, right)
      );
      break;
    case "title":
      sorted.sort(compareByTitle);
      break;
  }

  return sorted;
};
