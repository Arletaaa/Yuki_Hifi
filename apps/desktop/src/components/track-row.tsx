import type { CSSProperties } from "react";
import { formatDuration, getAudioFormatLabel, type Track } from "@arlhifi/shared";
import { cn } from "@arlhifi/ui";
import { CoverArt } from "./cover-art";

interface RowStyle extends CSSProperties {
  readonly "--row-index": number;
}

const getRowStyle = (index: number): RowStyle => ({ "--row-index": Math.min(index, 12) });

export const TrackListHead = () => (
  <div className="track-grid track-list__head">
    <span>#</span>
    <span>曲目</span>
    <span>专辑</span>
    <span>格式</span>
    <span className="is-right">时长</span>
  </div>
);

export interface TrackRowProps {
  readonly index: number;
  readonly isCurrent: boolean;
  readonly onPlay: (track: Track) => void;
  readonly track: Track;
}

export const TrackRow = ({ index, isCurrent, onPlay, track }: TrackRowProps) => {
  return (
    <button
      className={cn("track-grid", "track-row", isCurrent && "is-current")}
      onClick={() => {
        onPlay(track);
      }}
      style={getRowStyle(index)}
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
};
