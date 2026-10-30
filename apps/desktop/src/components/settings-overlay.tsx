import { useState } from "react";
import { useLibraryImport } from "../hooks/use-library-import";
import { getDesktopErrorMessage } from "../lib/desktop-error";
import { librarySortOptions } from "../lib/library-filter";
import { usePlayerStore } from "../store/player-store";
import { useSettingsStore } from "../store/settings-store";
import { ManageOverlay } from "./manage-overlay";

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

const LIGHT_SWATCHES: readonly Swatch[] = [
  { id: "morning", base: "#f0d7b4" },
  { id: "night", base: "#7fa6c9" },
  { id: "spot", base: "#fff4e2" },
  { id: "starry", base: "#26346a" }
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const progressLabel = importState.progress
    ? `正在导入 ${importState.progress.completed}/${importState.progress.total}`
    : "正在导入…";

  const openLibraryFolder = async (): Promise<void> => {
    const api = window.arltHifiDesktop;

    if (!api) {
      setActionError("网页预览没有音频目录，请使用 Electron 桌面应用。");
      return;
    }

    try {
      await api.openLibraryFolder();
      setActionError(null);
    } catch (caught) {
      setActionError(getDesktopErrorMessage(caught));
    }
  };

  return (
    <>
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
            <button className="library-import__button" onClick={() => { setManageOpen(true); }} type="button">
              管理歌曲
            </button>
            <button className="library-import__button" onClick={() => void openLibraryFolder()} type="button">
              打开音频文件夹
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
          {actionError ? (
            <p className="library-import__status is-error" role="alert">
              {actionError}
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

      <div className="preset-pair">
        <SwatchGroup items={TABLE_SWATCHES} label="台面" onChange={(id) => { setScenePreset({ table: id }); }} value={scenePreset.table} />
        <SwatchGroup items={BASE_SWATCHES} label="台底" onChange={(id) => { setScenePreset({ base: id }); }} value={scenePreset.base} />
      </div>

      <div className="preset-pair">
        <SwatchGroup items={WALL_SWATCHES} label="墙面" onChange={(id) => { setScenePreset({ wall: id }); }} value={scenePreset.wall} />
        <SwatchGroup items={LIGHT_SWATCHES} label="光效" onChange={(id) => { setScenePreset({ light: id }); }} value={scenePreset.light} />
      </div>

      <div className="settings-footer">
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
      </div>

      <p className="settings-overlay__credit">
        "CD Jewel Case" by 蓝人组合 · CC-BY 4.0 · "CD player" by nguyentrongtam0512 · CC-BY 4.0
      </p>
      </div>

      {manageOpen ? (
        <ManageOverlay
          onClose={() => {
            setManageOpen(false);
          }}
        />
      ) : null}
    </>
  );
};
