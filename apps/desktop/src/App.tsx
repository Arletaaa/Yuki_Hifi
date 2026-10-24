import { useEffect, useMemo, useRef, useState } from "react";
import { getSelectedDirectoryPath } from "@arlhifi/shared";
import { AppRail, type PageId } from "./components/app-rail";
import { BackgroundScene } from "./components/background-scene";
import { LibraryPage, type LibraryScanStatus } from "./components/library-page";
import { PlayerBar } from "./components/player-bar";
import { QueuePage } from "./components/queue-page";
import { SettingsPage } from "./components/settings-page";
import {
  getDemoDirectoryPath,
  getDemoInitialPage,
  getSceneAutoSpin,
  getScenePreviewTrackCount,
  isScenePreviewRequested
} from "./dev/demo-params";
import { useApplyPreferences } from "./hooks/use-app-preferences";
import { useSaveSettings } from "./hooks/use-settings-sync";
import { useAudioPlayback } from "./hooks/use-audio-playback";
import { groupTracksForGallery } from "./lib/album-groups";
import { SceneStage } from "./scene/scene-stage";
import { usePlayerStore } from "./store/player-store";
import { useSettingsStore } from "./store/settings-store";
import { useWallpaperStore } from "./store/wallpaper-store";

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;

export const App = () => {
  useAudioPlayback();
  useApplyPreferences();

  const [page, setPage] = useState<PageId>(() => getDemoInitialPage() ?? "library");
  const [scenePreview, setScenePreview] = useState<boolean>(() => isScenePreviewRequested());
  const [directoryPath, setDirectoryPath] = useState<string | null>(() => getDemoDirectoryPath());
  const [scanStatus, setScanStatus] = useState<LibraryScanStatus>("idle");
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);
  const [wallpaperErrorMessage, setWallpaperErrorMessage] = useState<string | null>(null);

  const library = usePlayerStore((state) => state.library);
  const queue = usePlayerStore((state) => state.queue);
  const favorites = usePlayerStore((state) => state.favorites);
  const currentTrackId = usePlayerStore((state) => state.currentTrack?.id ?? null);
  const loadLibrary = usePlayerStore((state) => state.loadLibrary);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const removeFromQueue = usePlayerStore((state) => state.removeFromQueue);
  const clearQueue = usePlayerStore((state) => state.clearQueue);
  const playbackStatus = usePlayerStore((state) => state.status);
  const positionSeconds = usePlayerStore((state) => state.positionSeconds);
  const durationSeconds = usePlayerStore((state) => state.durationSeconds);
  const togglePlayback = usePlayerStore((state) => state.togglePlayback);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrevious = usePlayerStore((state) => state.playPrevious);
  const setWallpaperPath = useWallpaperStore((state) => state.setPath);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const hydrateWallpaper = useWallpaperStore((state) => state.hydrate);

  // 展厅槽位 = 专辑/作者分组；收藏标记到"组"上（组内任意一首收藏即高亮）。
  const galleryGroups = useMemo(() => groupTracksForGallery(library), [library]);

  const favoriteGroupIds = useMemo(() => {
    const favoriteSet = new Set(favorites);

    return galleryGroups
      .filter((group) => group.trackIds.some((trackId) => favoriteSet.has(trackId)))
      .map((group) => group.id);
  }, [favorites, galleryGroups]);

  const scanDirectoryRef = useRef<(path: string) => Promise<void>>(async () => {});

  useSaveSettings(directoryPath);

  // 启动时读取一次 settings.json：恢复主题、动效、音量、收藏、壁纸与上次目录。
  useEffect(() => {
    const api = window.arltHifiDesktop;

    if (!api) {
      return;
    }

    let cancelled = false;

    void api.loadSettings().then((settings) => {
      if (cancelled) {
        return;
      }

      hydrateSettings(settings);
      hydrateWallpaper(settings);
      usePlayerStore.setState({ volume: settings.volume, favorites: settings.favorites });

      if (settings.musicDirectory) {
        setDirectoryPath(settings.musicDirectory);
        void scanDirectoryRef.current(settings.musicDirectory);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hydrateSettings, hydrateWallpaper]);

  useEffect(() => {
    scanDirectoryRef.current = scanDirectory;
  });

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

      setWallpaperPath(result.filePath);
      setWallpaperErrorMessage(null);
    } catch (error) {
      setWallpaperErrorMessage(getErrorMessage(error, "选择背景图片失败。"));
    }
  };

  // S2R-0：开发模式下 `?scene=1` 打开 3D 长廊压测场景；S2R-1 会把它接成库的主视图。
  if (scenePreview) {
    return (
      <SceneStage
        currentTrackId={currentTrackId}
        durationSeconds={durationSeconds}
        favoriteGroupIds={favoriteGroupIds}
        groups={galleryGroups}
        onExit={() => {
          setScenePreview(false);
        }}
        onNext={playNext}
        onPlayTrack={playTrack}
        onPrev={playPrevious}
        onToggle={togglePlayback}
        playing={playbackStatus === "playing"}
        positionSeconds={positionSeconds}
        tracks={library}
      />
    );
  }

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
              favoriteIds={favorites}
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
              favoriteIds={favorites}
              onClearQueue={clearQueue}
              onGoToLibrary={() => {
                setPage("library");
              }}
              onPlayTrack={playTrack}
              onRemoveFromQueue={(track) => {
                removeFromQueue(track.id);
              }}
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
