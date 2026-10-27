import type { LibrarySortKey, Track } from "@arlhifi/shared";

/** 展厅里的一个槽位：同一个专辑/作者的多张 CD 捆在一起。 */
export interface GalleryGroup {
  readonly artist: string;
  readonly coverPath: string | null;
  readonly durationSeconds: number;
  readonly id: string;
  /** 槽位在曲库里的首次出现顺序（manifest 顺序，用于"导入时间"排序）。 */
  readonly order: number;
  readonly title: string;
  readonly trackIds: readonly string[];
}

const UNKNOWN_ALBUM = "Unknown Album";
const UNKNOWN_ARTIST = "Unknown Artist";

const groupKeyOf = (track: Track): string => {
  const hasAlbum = track.album.trim().length > 0 && track.album !== UNKNOWN_ALBUM;
  const hasArtist = track.artist.trim().length > 0 && track.artist !== UNKNOWN_ARTIST;

  if (hasAlbum && hasArtist) {
    return `${track.artist}::${track.album}`;
  }

  if (hasAlbum) {
    return `album::${track.album}`;
  }

  if (hasArtist) {
    return `artist::${track.artist}`;
  }

  return `track::${track.id}`;
};

const titleOf = (track: Track): string =>
  track.album.trim().length > 0 && track.album !== UNKNOWN_ALBUM ? track.album : track.artist;

const compareGroups = (sortKey: LibrarySortKey) => {
  switch (sortKey) {
    case "artist":
      return (left: GalleryGroup, right: GalleryGroup): number =>
        left.artist.localeCompare(right.artist) || left.title.localeCompare(right.title);
    case "duration":
      return (left: GalleryGroup, right: GalleryGroup): number =>
        left.durationSeconds - right.durationSeconds || left.title.localeCompare(right.title);
    case "imported":
      return (left: GalleryGroup, right: GalleryGroup): number => left.order - right.order;
    case "title":
    default:
      return (left: GalleryGroup, right: GalleryGroup): number =>
        left.title.localeCompare(right.title) || left.artist.localeCompare(right.artist);
  }
};

/**
 * 把曲库折叠成展厅槽位：同专辑（同作者）一个槽位，无专辑信息时按作者归并。
 * 纯函数，可单测；输入顺序即 manifest 顺序，"导入时间"排序依赖它。
 */
export const groupTracksForGallery = (
  tracks: readonly Track[],
  sortKey: LibrarySortKey = "title"
): readonly GalleryGroup[] => {
  const buckets = new Map<string, { order: number; tracks: Track[] }>();

  for (const [index, track] of tracks.entries()) {
    const key = groupKeyOf(track);
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.tracks.push(track);
    } else {
      buckets.set(key, { order: index, tracks: [track] });
    }
  }

  const groups: GalleryGroup[] = [];

  for (const [key, bucket] of buckets) {
    const first = bucket.tracks[0];

    if (!first) {
      continue;
    }

    groups.push({
      id: key,
      order: bucket.order,
      artist: first.artist,
      title: titleOf(first),
      coverPath: bucket.tracks.find((track) => track.coverPath !== null)?.coverPath ?? null,
      durationSeconds: bucket.tracks.reduce((total, track) => total + track.durationSeconds, 0),
      trackIds: bucket.tracks.map((track) => track.id)
    });
  }

  return groups.sort(compareGroups(sortKey));
};
