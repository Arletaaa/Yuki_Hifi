import { useMemo, useState, type CSSProperties } from "react";
import { AlertTriangle, Disc3, Loader2, RefreshCw } from "lucide-react";
import type { Track } from "@arlhifi/shared";
import { Button, IconButton } from "@arlhifi/ui";
import { filterTracks, librarySortOptions, sortTracks, type LibrarySortKey } from "../lib/library-filter";
import { EmptyState } from "./empty-state";
import { TrackListHead, TrackRow } from "./track-row";

export type LibraryScanStatus = "idle" | "selecting" | "scanning" | "success" | "empty" | "error";

interface RowStyle extends CSSProperties {
  readonly "--row-index": number;
}

const rowStyle = (index: number): RowStyle => ({ "--row-index": Math.min(index, 12) });

const skeletonRows = Array.from({ length: 8 }, (_unused, index) => index);

const emptyCopy: Record<LibraryScanStatus, string> = {
  idle: "选择一个本地音乐文件夹，扫描 flac / wav / mp3 / m4a / ogg 后会在这里列出曲目。",
  selecting: "正在等待你选择音乐文件夹。",
  scanning: "正在递归扫描目录，读取曲目信息与封面。",
  success: "扫描完成。",
  empty: "这个目录里没有发现支持的音频文件，可以换一个文件夹再试。",
  error: "扫描时遇到问题，请确认文件夹仍然存在且应用有读取权限。"
};

const LibrarySkeleton = () => (
  <div aria-busy="true" aria-label="正在扫描目录" className="track-list">
    <TrackListHead />
    <div className="track-list__body">
      {skeletonRows.map((row) => (
        <div className="track-grid skeleton-row" key={`skeleton-${row}`} style={rowStyle(row)}>
          <span className="skeleton skeleton--index" />
          <span className="skeleton-row__main">
            <span className="skeleton skeleton--cover" />
            <span className="skeleton-row__text">
              <span className="skeleton skeleton--title" />
              <span className="skeleton skeleton--artist" />
            </span>
          </span>
          <span className="skeleton skeleton--album" />
          <span className="skeleton skeleton--badge" />
          <span className="skeleton skeleton--time" />
        </div>
      ))}
    </div>
  </div>
);

export interface LibraryPageProps {
  readonly currentTrackId: string | null;
  readonly directoryPath: string | null;
  readonly errorMessage: string | null;
  readonly favoriteIds: readonly string[];
  readonly onPlayTrack: (track: Track) => void;
  readonly onRefresh: () => void;
  readonly onSelectDirectory: () => void;
  readonly scanStatus: LibraryScanStatus;
  readonly tracks: readonly Track[];
}

export const LibraryPage = ({
  currentTrackId,
  directoryPath,
  errorMessage,
  favoriteIds,
  onPlayTrack,
  onRefresh,
  onSelectDirectory,
  scanStatus,
  tracks
}: LibraryPageProps) => {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<LibrarySortKey>("title");
  const isBusy = scanStatus === "selecting" || scanStatus === "scanning";
  const hasTracks = tracks.length > 0;
  const visibleTracks = useMemo(() => sortTracks(filterTracks(tracks, query), sortKey), [sortKey, tracks, query]);
  const isSearching = query.trim().length > 0;

  return (
    <section className="page">
      <header className="page__header">
        <div className="page__heading">
          <p className="page__eyebrow">
            LOCAL LIBRARY<span className="page__kana">ろーかる</span>
          </p>
          <h1 className="page__title">音乐库</h1>
          <p className="page__sub">{directoryPath ?? "尚未选择音乐文件夹"}</p>
        </div>
        <div className="page__actions">
          <div className="library-toolbar">
            <input
              aria-label="搜索曲目"
              className="search-input"
              onChange={(event) => {
                setQuery(event.currentTarget.value);
              }}
              placeholder="搜索标题 / 艺术家 / 专辑"
              type="search"
              value={query}
            />
            <select
              aria-label="排序方式"
              className="sort-select"
              onChange={(event) => {
                setSortKey(event.currentTarget.value as LibrarySortKey);
              }}
              value={sortKey}
            >
              {librarySortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <span className="count-chip">{isSearching ? `${visibleTracks.length} / ${tracks.length}` : `${tracks.length} 首`}</span>
          <IconButton disabled={!directoryPath || isBusy} label="重新扫描当前目录" onClick={onRefresh}>
            <RefreshCw aria-hidden="true" size={16} />
          </IconButton>
          <Button disabled={isBusy} onClick={onSelectDirectory} variant="primary">
            {isBusy ? "扫描中…" : hasTracks ? "更换目录" : "选择目录"}
          </Button>
        </div>
      </header>

      <div className="page__body">
        {scanStatus === "error" ? (
          <EmptyState
            action={
              <Button onClick={onSelectDirectory} variant="primary">
                重新选择目录
              </Button>
            }
            copy={errorMessage ?? emptyCopy.error}
            icon={<AlertTriangle size={26} strokeWidth={1.5} />}
            title="扫描失败"
          />
        ) : isBusy && !hasTracks ? (
          scanStatus === "scanning" ? (
            <LibrarySkeleton />
          ) : (
            <EmptyState
              copy={emptyCopy.selecting}
              icon={<Loader2 className="spin" size={26} strokeWidth={1.5} />}
              title="选择文件夹…"
            />
          )
        ) : hasTracks && visibleTracks.length === 0 ? (
          <EmptyState
            action={
              <Button
                onClick={() => {
                  setQuery("");
                }}
                variant="ghost"
              >
                清除搜索
              </Button>
            }
            copy={`没有匹配「${query.trim()}」的曲目，换个关键词试试。`}
            icon={<Disc3 size={26} strokeWidth={1.5} />}
            title="没有匹配的曲目"
          />
        ) : hasTracks ? (
          <div className="track-list">
            <TrackListHead />
            <div className="track-list__body">
              {visibleTracks.map((track, index) => (
                <TrackRow
                  index={index}
                  isCurrent={track.id === currentTrackId}
                  isFavorite={favoriteIds.includes(track.id)}
                  key={track.id}
                  onPlay={onPlayTrack}
                  track={track}
                />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            action={
              <Button onClick={onSelectDirectory} variant="primary">
                选择音乐文件夹
              </Button>
            }
            copy={emptyCopy[scanStatus]}
            icon={<Disc3 size={26} strokeWidth={1.5} />}
            title="音乐库还是空的"
          />
        )}
      </div>
    </section>
  );
};
