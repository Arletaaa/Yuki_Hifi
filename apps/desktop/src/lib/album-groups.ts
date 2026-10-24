import type { Track } from "@arlhifi/shared";

/** 展厅里的一个槽位：同一个专辑/作者的多张 CD 捆在一起。 */
export interface GalleryGroup {
  readonly artist: string;
  readonly coverPath: string | null;
  readonly id: string;
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

/**
 * 把曲库折叠成展厅槽位：同专辑（同作者）一个槽位，无专辑信息时按作者归并。
 * 纯函数，可单测；顺序按槽位标题排序，保证场景稳定。
 */
export const groupTracksForGallery = (tracks: readonly Track[]): readonly GalleryGroup[] => {
  const buckets = new Map<string, Track[]>();

  for (const track of tracks) {
    const key = groupKeyOf(track);
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.push(track);
    } else {
      buckets.set(key, [track]);
    }
  }

  const groups: GalleryGroup[] = [];

  for (const [key, bucket] of buckets) {
    const first = bucket[0];

    if (!first) {
      continue;
    }

    const coverPath = bucket.find((track) => track.coverPath !== null)?.coverPath ?? null;

    groups.push({
      id: key,
      artist: first.artist,
      title: titleOf(first),
      coverPath,
      trackIds: bucket.map((track) => track.id)
    });
  }

  return groups.sort((left, right) => left.title.localeCompare(right.title) || left.artist.localeCompare(right.artist));
};
