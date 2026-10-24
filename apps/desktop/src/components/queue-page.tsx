import { ListMusic, Trash2 } from "lucide-react";
import { formatDuration, type Track } from "@arlhifi/shared";
import { Button } from "@arlhifi/ui";
import { EmptyState } from "./empty-state";
import { TrackListHead, TrackRow } from "./track-row";

export interface QueuePageProps {
  readonly currentTrackId: string | null;
  readonly favoriteIds: readonly string[];
  readonly onClearQueue: () => void;
  readonly onGoToLibrary: () => void;
  readonly onPlayTrack: (track: Track) => void;
  readonly onRemoveFromQueue: (track: Track) => void;
  readonly queue: readonly Track[];
}

export const QueuePage = ({
  currentTrackId,
  favoriteIds,
  onClearQueue,
  onGoToLibrary,
  onPlayTrack,
  onRemoveFromQueue,
  queue
}: QueuePageProps) => {
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
          <Button disabled={queue.length === 0} onClick={onClearQueue} size="sm" variant="quiet">
            <Trash2 aria-hidden="true" size={14} />
            清空队列
          </Button>
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
            <TrackListHead withActions />
            <div className="track-list__body">
              {queue.map((track, index) => (
                <TrackRow
                  index={index}
                  isCurrent={track.id === currentTrackId}
                  isFavorite={favoriteIds.includes(track.id)}
                  key={`${track.id}-${index}`}
                  onPlay={onPlayTrack}
                  onRemove={onRemoveFromQueue}
                  track={track}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
