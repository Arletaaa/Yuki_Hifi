import { ListMusic } from "lucide-react";
import { formatDuration, getAudioFormatLabel, type Track } from "@arlhifi/shared";
import { Button, cn } from "@arlhifi/ui";
import { CoverArt } from "./cover-art";
import { EmptyState } from "./empty-state";

export interface QueuePageProps {
  readonly currentTrackId: string | null;
  readonly onGoToLibrary: () => void;
  readonly onPlayTrack: (track: Track) => void;
  readonly queue: readonly Track[];
}

export const QueuePage = ({ currentTrackId, onGoToLibrary, onPlayTrack, queue }: QueuePageProps) => {
  const totalSeconds = queue.reduce((total, track) => total + track.durationSeconds, 0);

  return (
    <section className="page">
      <header className="page__header">
        <div className="page__heading">
          <p className="page__eyebrow">
            PLAY QUEUE<span className="page__kana">きょく</span>
          </p>
          <h1 className="page__title">播放队列</h1>
          <p className="page__sub">
            {queue.length > 0 ? `${queue.length} 首 · 共 ${formatDuration(totalSeconds)}` : "队列为空"}
          </p>
        </div>
        <div className="page__actions">
          <Button onClick={onGoToLibrary} variant="ghost">
            去音乐库
          </Button>
        </div>
      </header>

      <div className="page__body">
        {queue.length === 0 ? (
          <EmptyState
            action={
              <Button onClick={onGoToLibrary} variant="primary">
                去音乐库选曲
              </Button>
            }
            copy="从音乐库播放任意曲目后，待播顺序会出现在这里。"
            icon={<ListMusic size={26} strokeWidth={1.5} />}
            title="队列还是空的"
          />
        ) : (
          <div className="track-list">
            <div className="track-grid track-list__head">
              <span>#</span>
              <span>曲目</span>
              <span>专辑</span>
              <span>格式</span>
              <span className="is-right">时长</span>
            </div>
            <div className="track-list__body">
              {queue.map((track, index) => {
                const isCurrent = track.id === currentTrackId;

                return (
                  <button
                    className={cn("track-grid", "track-row", isCurrent && "is-current")}
                    key={`${track.id}-${index}`}
                    onClick={() => {
                      onPlayTrack(track);
                    }}
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
        )}
      </div>
    </section>
  );
};
