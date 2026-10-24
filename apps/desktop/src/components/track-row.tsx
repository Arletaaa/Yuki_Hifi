import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { X } from "lucide-react";
import { formatDuration, getAudioFormatLabel, type Track } from "@arlhifi/shared";
import { cn } from "@arlhifi/ui";
import { CoverArt } from "./cover-art";

interface RowStyle extends CSSProperties {
  readonly "--row-index": number;
}

const getRowStyle = (index: number): RowStyle => ({ "--row-index": Math.min(index, 12) });

export const TrackListHead = ({ withActions = false }: { readonly withActions?: boolean }) => (
  <div className={cn("track-grid", "track-list__head", withActions && "has-actions")}>
    <span>#</span>
    <span>曲目</span>
    <span>专辑</span>
    <span>格式</span>
    <span className="is-right">时长</span>
    {withActions ? <span aria-hidden="true" /> : null}
  </div>
);

export interface TrackRowProps {
  readonly index: number;
  readonly isCurrent: boolean;
  readonly isFavorite: boolean;
  readonly onPlay: (track: Track) => void;
  readonly onRemove?: (track: Track) => void;
  readonly track: Track;
}

export const TrackRow = ({ index, isCurrent, isFavorite, onPlay, onRemove, track }: TrackRowProps) => {
  const handleClick = (): void => {
    onPlay(track);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPlay(track);
    }
  };

  const handleRemove = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    onRemove?.(track);
  };

  return (
    <div
      aria-label={`播放 ${track.title} — ${track.artist}`}
      className={cn("track-grid", "track-row", isCurrent && "is-current", Boolean(onRemove) && "has-actions")}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      style={getRowStyle(index)}
      tabIndex={0}
      title={`${track.title} · ${track.filePath}`}
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
        {isFavorite ? (
          <span aria-label="已收藏" className="track-row__star" role="img">
            ★
          </span>
        ) : null}
      </span>
      <span className="track-row__duration is-right">{formatDuration(track.durationSeconds)}</span>
      {onRemove ? (
        <span className="track-row__actions">
          <button
            aria-label={`从队列移除 ${track.title}`}
            className="track-row__remove"
            onClick={handleRemove}
            type="button"
          >
            <X aria-hidden="true" size={14} />
          </button>
        </span>
      ) : null}
    </div>
  );
};
