import { AlertTriangle, Disc3, Loader2, RefreshCw } from "lucide-react";
import { formatDuration, getAudioFormatLabel, type Track } from "@arlhifi/shared";
import { Button, IconButton, cn } from "@arlhifi/ui";
import { CoverArt } from "./cover-art";
import { EmptyState } from "./empty-state";

export type LibraryScanStatus = "idle" | "selecting" | "scanning" | "success" | "empty" | "error";

const emptyCopy: Record<LibraryScanStatus, string> = {
  idle: "选择一个本地音乐文件夹，扫描 flac / wav / mp3 / m4a / ogg 后会在这里列出曲目。",
  selecting: "正在等待你选择音乐文件夹。",
  scanning: "正在递归扫描目录，读取曲目信息与封面。",
  success: "扫描完成。",
  empty: "这个目录里没有发现支持的音频文件，可以换一个文件夹再试。",
  error: "扫描时遇到问题，请确认文件夹仍然存在且应用有读取权限。"
};

export interface LibraryPageProps {
  readonly currentTrackId: string | null;
  readonly directoryPath: string | null;
  readonly errorMessage: string | null;
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
  onPlayTrack,
  onRefresh,
  onSelectDirectory,
  scanStatus,
  tracks
}: LibraryPageProps) => {
  const isBusy = scanStatus === "selecting" || scanStatus === "scanning";
  const hasTracks = tracks.length > 0;

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
          <span className="count-chip">{tracks.length} 首</span>
          <IconButton
            disabled={!directoryPath || isBusy}
            label="重新扫描当前目录"
            onClick={onRefresh}
          >
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
          <EmptyState
            copy={emptyCopy[scanStatus]}
            icon={<Loader2 className="spin" size={26} strokeWidth={1.5} />}
            title={scanStatus === "selecting" ? "选择文件夹…" : "正在扫描…"}
          />
        ) : hasTracks ? (
          <div className="track-list">
            <div className="track-grid track-list__head">
              <span>#</span>
              <span>曲目</span>
              <span>专辑</span>
              <span>格式</span>
              <span className="is-right">时长</span>
            </div>
            <div className="track-list__body">
              {tracks.map((track, index) => {
                const isCurrent = track.id === currentTrackId;

                return (
                  <button
                    className={cn("track-grid", "track-row", isCurrent && "is-current")}
                    key={track.id}
                    onClick={() => {
                      onPlayTrack(track);
                    }}
                    title={`${track.title} · ${track.filePath}`}
                    type="button"
                  >
                    <span className="track-row__index">
                      {isCurrent ? (
                        <span aria-hidden="true" className="eq">
                          <span />
                          <span />
                          <span />
                        </span>
                      ) : (
                        String(index + 1).padStart(2, "0")
                      )}
                    </span>
                    <span className="track-row__main">
                      <CoverArt className="cover--row" seed={track.id} title={track.title} />
                      <span className="track-row__text">
                        <span className="track-row__title">{track.title}</span>
                        <span className="track-row__artist">{track.artist}</span>
                      </span>
                    </span>
                    <span className="track-row__album">{track.album}</span>
                    <span className="track-row__format">
                      <span className="badge">{getAudioFormatLabel(track.filePath)}</span>
                    </span>
                    <span className="track-row__duration is-right">{formatDuration(track.durationSeconds)}</span>
                  </button>
                );
              })}
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
