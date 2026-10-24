import { useState } from "react";
import { createBackgroundMediaUrl, getSelectedDirectoryPath } from "@arlhifi/shared";
import { AppRail, type PageId } from "./components/app-rail";
import { BackgroundScene } from "./components/background-scene";
import { LibraryPage, type LibraryScanStatus } from "./components/library-page";
import { PlayerBar } from "./components/player-bar";
import { QueuePage } from "./components/queue-page";
import { SettingsPage } from "./components/settings-page";
import { getDemoDirectoryPath, getDemoInitialPage } from "./dev/demo-params";
import { useApplyPreferences } from "./hooks/use-app-preferences";
import { useAudioPlayback } from "./hooks/use-audio-playback";
import { usePlayerStore } from "./store/player-store";
import { useWallpaperStore } from "./store/wallpaper-store";

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;

export const App = () => {
  useAudioPlayback();
  useApplyPreferences();

  const [page, setPage] = useState<PageId>(() => getDemoInitialPage() ?? "library");
  const [directoryPath, setDirectoryPath] = useState<string | null>(() => getDemoDirectoryPath());
  const [scanStatus, setScanStatus] = useState<LibraryScanStatus>("idle");
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);
  const [wallpaperErrorMessage, setWallpaperErrorMessage] = useState<string | null>(null);

  const library = usePlayerStore((state) => state.library);
  const queue = usePlayerStore((state) => state.queue);
  const currentTrackId = usePlayerStore((state) => state.currentTrack?.id ?? null);
  const loadLibrary = usePlayerStore((state) => state.loadLibrary);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const setWallpaper = useWallpaperStore((state) => state.setWallpaper);

  const scanDirectory = async (nextDirectoryPath: string): Promise<void> => {
    const api = window.arltHifiDesktop;

    if (!api) {
      setScanErrorMessage("当前环境不支持扫描本地文件夹，请在 Electron 桌面应用中使用。");
      setScanStatus("error");
      return;
    }

    setScanStatus("scanning");
    setScanErrorMessage(null);

    try {
      const tracks = await api.scanMusicDirectory(nextDirectoryPath);
      loadLibrary(tracks);
      setScanStatus(tracks.length > 0 ? "success" : "empty");
    } catch (error) {
      loadLibrary([]);
      setScanErrorMessage(getErrorMessage(error, "扫描音乐文件夹失败。"));
      setScanStatus("error");
    }
  };

  const handleSelectDirectory = async (): Promise<void> => {
    const api = window.arltHifiDesktop;

    if (!api) {
      setScanErrorMessage("当前环境不支持选择本地文件夹，请在 Electron 桌面应用中使用。");
      setScanStatus("error");
      return;
    }

    setScanStatus("selecting");
    setScanErrorMessage(null);

    try {
      const result = await api.selectMusicDirectory();
      const selectedPath = getSelectedDirectoryPath(result);

      if (!selectedPath) {
        setScanStatus(library.length > 0 ? "success" : directoryPath ? "empty" : "idle");
        return;
      }

      setDirectoryPath(selectedPath);
      await scanDirectory(selectedPath);
    } catch (error) {
      setScanErrorMessage(getErrorMessage(error, "选择音乐文件夹失败。"));
      setScanStatus("error");
    }
  };

  const handleRefresh = (): void => {
    if (!directoryPath) {
      return;
    }

    void scanDirectory(directoryPath);
  };

  const handleSelectWallpaper = async (): Promise<void> => {
    const api = window.arltHifiDesktop;

    if (!api) {
      setWallpaperErrorMessage("当前环境无法选择本地图片，请在 Electron 桌面应用中使用。");
      return;
    }

    try {
      const result = await api.selectBackgroundImage();

      if (result.canceled || !result.filePath) {
        return;
      }

      setWallpaper(createBackgroundMediaUrl(result.filePath));
      setWallpaperErrorMessage(null);
    } catch (error) {
      setWallpaperErrorMessage(getErrorMessage(error, "选择背景图片失败。"));
    }
  };

  return (
    <div className="app">
      <BackgroundScene />
      <div className="app__grid">
        <AppRail onNavigate={setPage} page={page} trackCount={library.length} />
        <main className="app__main" key={page}>
          {page === "library" ? (
            <LibraryPage
              currentTrackId={currentTrackId}
              directoryPath={directoryPath}
              errorMessage={scanErrorMessage}
              onPlayTrack={playTrack}
              onRefresh={handleRefresh}
              onSelectDirectory={() => {
                void handleSelectDirectory();
              }}
              scanStatus={scanStatus}
              tracks={library}
            />
          ) : null}
          {page === "queue" ? (
            <QueuePage
              currentTrackId={currentTrackId}
              onGoToLibrary={() => {
                setPage("library");
              }}
              onPlayTrack={playTrack}
              queue={queue}
            />
          ) : null}
          {page === "settings" ? (
            <SettingsPage
              onSelectWallpaper={() => {
                void handleSelectWallpaper();
              }}
              wallpaperErrorMessage={wallpaperErrorMessage}
            />
          ) : null}
        </main>
        <PlayerBar
          onOpenQueue={() => {
            setPage("queue");
          }}
        />
      </div>
    </div>
  );
};
