import { useMemo, useState } from "react";
import { formatDuration, type Track } from "@arlhifi/shared";
import { useLibraryImport } from "../hooks/use-library-import";
import { useLibraryManage } from "../hooks/use-library-manage";
import { librarySortOptions, sortTracks } from "../lib/library-filter";
import { usePlayerStore } from "../store/player-store";
import { useSettingsStore } from "../store/settings-store";

interface Swatch {
  readonly base: string;
  readonly id: string;
  readonly image?: string;
}

const TABLE_SWATCHES: readonly Swatch[] = [
  { id: "wood029", image: "/textures/table/wood029-color.jpg", base: "#6b4f34" },
  { id: "wood066", image: "/textures/table/wood066-color.jpg", base: "#8a5a35" },
  { id: "wood069", image: "/textures/table/wood069-color.jpg", base: "#5a4030" },
  { id: "wood095", image: "/textures/table/wood095-color.jpg", base: "#3f2f26" }
];

const BASE_SWATCHES: readonly Swatch[] = [
  { id: "wood002", image: "/textures/base/wood002-color.jpg", base: "#4a3324" },
  { id: "wood007", image: "/textures/base/wood007-color.jpg", base: "#6b4f34" },
  { id: "wood092", image: "/textures/base/wood092-color.jpg", base: "#2f3a2f" },
  { id: "wood096", image: "/textures/base/wood096-color.jpg", base: "#2a2b30" }
];

const WALL_SWATCHES: readonly Swatch[] = [
  { id: "fabric009", image: "/textures/wall/fabric009-color.jpg", base: "#5d2b2b" },
  { id: "fabric048", image: "/textures/wall/fabric048-color.jpg", base: "#8a8378" },
  { id: "leather012", image: "/textures/wall/leather012-color.jpg", base: "#4a3b33" },
  { id: "woodsiding009", image: "/textures/wall/woodsiding009-color.jpg", base: "#6b6152" }
];

const SILHOUETTE_SWATCHES: readonly Swatch[] = [
  { id: "leafset004", image: "/textures/leaf/leafset004-color.jpg", base: "#1b1f18" },
  { id: "leafset015", image: "/textures/leaf/leafset015-color.jpg", base: "#23281f" },
  { id: "leafset019", image: "/textures/leaf/leafset019-color.jpg", base: "#1a2220" },
  { id: "leafset025", image: "/textures/leaf/leafset025-color.jpg", base: "#20261c" }
];

const LIGHT_SWATCHES: readonly Swatch[] = [
  { id: "morning", base: "#f0d7b4" },
  { id: "night", base: "#7fa6c9" },
  { id: "spot", base: "#fff4e2" }
];

interface GroupProps {
  readonly items: readonly Swatch[];
  readonly label: string;
  readonly onChange: (id: string) => void;
  readonly value: string;
}

/** 一组材质球：超过 4 个时横向滚动。 */
const SwatchGroup = ({ items, label, onChange, value }: GroupProps) => (
  <div className="preset-group">
    <p className="preset-group__label">{label}</p>
    <div className="preset-group__strip">
      {items.map((item) => (
        <button
          className={`preset-ball${item.id === value ? " is-active" : ""}`}
          key={item.id}
          onClick={() => {
            onChange(item.id);
          }}
          type="button"
        >
          <span
            className="preset-ball__surface"
            style={
              item.image
                ? { backgroundImage: `url(${item.image})`, backgroundColor: item.base }
                : { backgroundColor: item.base }
            }
          />
        </button>
      ))}
    </div>
  </div>
);

export interface SettingsOverlayProps {
  readonly onClose: () => void;
}

/** 全透明设置浮层：音乐库导入/排序/管理 + 两列材质选择 + 音量 + 置底版权。 */
export const SettingsOverlay = ({ onClose }: SettingsOverlayProps) => {
  const volume = usePlayerStore((state) => state.volume);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const library = usePlayerStore((state) => state.library);
  const scenePreset = useSettingsStore((state) => state.scenePreset);
  const setScenePreset = useSettingsStore((state) => state.setScenePreset);
  const librarySort = useSettingsStore((state) => state.librarySort);
  const setLibrarySort = useSettingsStore((state) => state.setLibrarySort);
  const { busy, importFiles, importFolder, state: importState } = useLibraryImport();
  const { busyTrackId, deleteTrack, error: manageError, renameTrack, setTrackCover } = useLibraryManage();
  const [manageOpen, setManageOpen] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [confirmTrackId, setConfirmTrackId] = useState<string | null>(null);
  const sortedTracks = useMemo(() => sortTracks(library, librarySort), [library, librarySort]);
  const progressLabel = importState.progress
    ? `正在导入 ${importState.progress.completed}/${importState.progress.total}`
    : "正在导入…";

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

    if (await renameTrack(track.id, title)) {
      cancelRename();
    }
  };

  return (
    <div className="settings-overlay__inner">
      <button aria-label="关闭设置" className="settings-overlay__close" onClick={onClose} type="button">
        ✕
      </button>

      <section aria-label="音乐库" className="library-import">
        <div className="library-import__head">
          <p className="preset-group__label">音乐库</p>
          <p className="library-import__count">{library.length} 首已托管</p>
        </div>
        <div className="library-import__actions">
          <button className="library-import__button" disabled={busy} onClick={importFiles} type="button">
            选择音频文件
          </button>
          <button className="library-import__button" disabled={busy} onClick={importFolder} type="button">
            导入文件夹
          </button>
          {busy ? (
            <span aria-live="polite" className="library-import__status">
              {progressLabel}
            </span>
          ) : null}
        </div>
        {!busy && importState.message ? (
          <p
            className={`library-import__status${importState.phase === "error" ? " is-error" : ""}`}
            role="status"
          >
            {importState.message}
          </p>
        ) : null}

        <div className="library-sort">
          <p className="preset-group__label">排序</p>
          <div className="library-sort__options" role="group" aria-label="曲库排序">
            {librarySortOptions.map((option) => (
              <button
                aria-pressed={option.value === librarySort}
                className={`library-sort__option${option.value === librarySort ? " is-active" : ""}`}
                key={option.value}
                onClick={() => {
                  setLibrarySort(option.value);
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {library.length > 0 ? (
        <section aria-label="曲目管理" className="library-manage">
          <div className="library-manage__head">
            <p className="preset-group__label">曲目</p>
            <button
              aria-expanded={manageOpen}
              className="library-manage__toggle"
              onClick={() => {
                setManageOpen((open) => !open);
                setEditingTrackId(null);
                setConfirmTrackId(null);
              }}
              type="button"
            >
              {manageOpen ? "收起" : `管理 ${library.length} 首`}
            </button>
          </div>

          {manageOpen ? (
            <div className="library-manage__body">
              {manageError ? (
                <p className="library-import__status is-error" role="alert">
                  {manageError}
                </p>
              ) : null}

              <ul className="library-manage__list">
                {sortedTracks.map((track) => {
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
                                void setTrackCover(track.id);
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
                                    void deleteTrack(track.id);
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
          ) : null}
        </section>
      ) : null}

      <div className="preset-pair">
        <SwatchGroup items={TABLE_SWATCHES} label="台面" onChange={(id) => { setScenePreset({ table: id }); }} value={scenePreset.table} />
        <SwatchGroup items={BASE_SWATCHES} label="台底" onChange={(id) => { setScenePreset({ base: id }); }} value={scenePreset.base} />
      </div>

      <div className="preset-pair">
        <SwatchGroup items={WALL_SWATCHES} label="墙面" onChange={(id) => { setScenePreset({ wall: id }); }} value={scenePreset.wall} />
        <SwatchGroup items={SILHOUETTE_SWATCHES} label="剪影" onChange={(id) => { setScenePreset({ silhouette: id }); }} value={scenePreset.silhouette} />
      </div>

      <div className="preset-pair preset-pair--center">
        <SwatchGroup items={LIGHT_SWATCHES} label="光效" onChange={(id) => { setScenePreset({ light: id }); }} value={scenePreset.light} />
      </div>

      <div className="overlay-volume__row">
        <p className="overlay-volume__label">音量</p>
        <input
          aria-label="音量"
          className="overlay-volume"
          max={100}
          min={0}
          onChange={(event) => {
            setVolume(Number(event.currentTarget.value));
          }}
          type="range"
          value={volume}
        />
      </div>

      <p className="settings-overlay__credit">"CD Jewel Case" by 蓝人组合 · CC-BY 4.0</p>
    </div>
  );
};
