import { useCallback, useEffect, useState } from "react";
import type { Track } from "@arlhifi/shared";
import { useLibraryManage } from "../hooks/use-library-manage";
import { getDesktopErrorMessage } from "../lib/desktop-error";
import { TrackManager } from "./track-manager";

const webPreviewMessage = "网页预览无法管理曲库，请使用 Electron 桌面应用。";

/** 独立的管理曲库窗口：读取 manifest、行内管理、打开托管目录。 */
export const ManageWindow = () => {
  const [tracks, setTracks] = useState<readonly Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { busyTrackId, deleteTrack, error: manageError, renameTrack, setTrackCover } = useLibraryManage();

  const reload = useCallback(async (): Promise<void> => {
    const api = window.arltHifiDesktop;

    if (!api) {
      setLoadError(webPreviewMessage);
      setLoading(false);
      return;
    }

    try {
      setTracks(await api.loadLibrary());
      setLoadError(null);
    } catch (caught) {
      setLoadError(getDesktopErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "管理曲库";
    void reload();
  }, [reload]);

  // 从主窗口切回来时重新读一次，导入/删除后列表不会过期。
  useEffect(() => {
    const refresh = (): void => {
      void reload();
    };

    window.addEventListener("focus", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
    };
  }, [reload]);

  const runManage = async (action: () => Promise<boolean>): Promise<boolean> => {
    const changed = await action();

    if (changed) {
      await reload();
    }

    return changed;
  };

  const openLibraryFolder = async (): Promise<void> => {
    const api = window.arltHifiDesktop;

    if (!api) {
      setActionError(webPreviewMessage);
      return;
    }

    try {
      await api.openLibraryFolder();
      setActionError(null);
    } catch (caught) {
      setActionError(getDesktopErrorMessage(caught));
    }
  };

  const error = loadError ?? manageError ?? actionError;

  return (
    <main className="manage-window">
      <header className="manage-window__head">
        <div>
          <p className="manage-window__eyebrow">Library</p>
          <h1 className="manage-window__title">管理曲库</h1>
          <p className="manage-window__meta">
            {loading ? "正在读取曲库…" : `${tracks.length} 首曲目 · 重命名 / 封面 / 删除只作用于托管副本`}
          </p>
        </div>
        <div className="manage-window__actions">
          <button className="library-import__button" onClick={() => void openLibraryFolder()} type="button">
            打开音频文件夹
          </button>
          <button className="library-import__button" onClick={() => void reload()} type="button">
            刷新
          </button>
        </div>
      </header>

      <section className="manage-window__body" aria-label="曲目列表">
        {loading ? (
          <p className="manage-window__empty">正在读取曲库…</p>
        ) : (
          <TrackManager
            busyTrackId={busyTrackId}
            error={error}
            onCover={(trackId) => runManage(() => setTrackCover(trackId))}
            onDelete={(trackId) => runManage(() => deleteTrack(trackId))}
            onRename={(trackId, title) => runManage(() => renameTrack(trackId, title))}
            tracks={tracks}
          />
        )}
      </section>
    </main>
  );
};
