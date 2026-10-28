import { useState } from "react";
import { formatDuration, type Track } from "@arlhifi/shared";

export interface TrackManagerProps {
  readonly busyTrackId: string | null;
  readonly error: string | null;
  readonly onCover: (trackId: string) => Promise<boolean>;
  readonly onDelete: (trackId: string) => Promise<boolean>;
  readonly onRename: (trackId: string, title: string) => Promise<boolean>;
  readonly tracks: readonly Track[];
}

/** 曲目管理列表：行内重命名、设封面、删除（二次确认）。 */
export const TrackManager = ({
  busyTrackId,
  error,
  onCover,
  onDelete,
  onRename,
  tracks
}: TrackManagerProps) => {
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [confirmTrackId, setConfirmTrackId] = useState<string | null>(null);

  const beginRename = (track: Track): void => {
    setConfirmTrackId(null);
    setEditingTrackId(track.id);
    setDraftTitle(track.title);
  };

  const cancelRename = (): void => {
    setEditingTrackId(null);
    setDraftTitle("");
  };

  const submitRename = async (track: Track): Promise<void> => {
    const title = draftTitle.trim();

    if (title.length === 0 || title === track.title) {
      cancelRename();
      return;
    }

    if (await onRename(track.id, title)) {
      cancelRename();
    }
  };

  if (tracks.length === 0) {
    return <p className="manage-window__empty">曲库还是空的，先在设置里导入音乐。</p>;
  }

  return (
    <div className="track-manager">
      {error ? (
        <p className="library-import__status is-error" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="library-manage__list">
        {tracks.map((track) => {
          const editing = editingTrackId === track.id;
          const confirming = confirmTrackId === track.id;
          const busyRow = busyTrackId === track.id;

          return (
            <li className="library-manage__row" key={track.id}>
              <div className="library-manage__meta">
                {editing ? (
                  <input
                    aria-label={`重命名 ${track.title}`}
                    autoFocus
                    className="library-manage__input"
                    onChange={(event) => {
                      setDraftTitle(event.currentTarget.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void submitRename(track);
                      } else if (event.key === "Escape") {
                        cancelRename();
                      }
                    }}
                    value={draftTitle}
                  />
                ) : (
                  <span className="library-manage__title">{track.title}</span>
                )}
                <span className="library-manage__sub">
                  {track.artist} · {track.album} · {formatDuration(track.durationSeconds)}
                </span>
              </div>

              <div className="library-manage__actions">
                {editing ? (
                  <>
                    <button
                      className="library-manage__action"
                      disabled={busyRow}
                      onClick={() => {
                        void submitRename(track);
                      }}
                      type="button"
                    >
                      保存
                    </button>
                    <button className="library-manage__action" onClick={cancelRename} type="button">
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="library-manage__action"
                      disabled={busyRow}
                      onClick={() => {
                        beginRename(track);
                      }}
                      type="button"
                    >
                      重命名
                    </button>
                    <button
                      className="library-manage__action"
                      disabled={busyRow}
                      onClick={() => {
                        setConfirmTrackId(null);
                        void onCover(track.id);
                      }}
                      type="button"
                    >
                      封面
                    </button>
                    {confirming ? (
                      <>
                        <button
                          className="library-manage__action is-danger"
                          disabled={busyRow}
                          onClick={() => {
                            setConfirmTrackId(null);
                            void onDelete(track.id);
                          }}
                          type="button"
                        >
                          确认删除
                        </button>
                        <button
                          className="library-manage__action"
                          onClick={() => {
                            setConfirmTrackId(null);
                          }}
                          type="button"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <button
                        className="library-manage__action is-danger"
                        disabled={busyRow}
                        onClick={() => {
                          setConfirmTrackId(track.id);
                        }}
                        type="button"
                      >
                        删除
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
