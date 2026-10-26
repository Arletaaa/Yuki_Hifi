import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SettingsOverlay } from "./components/settings-overlay";
import { getDemoDirectoryPath } from "./dev/demo-params";
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

/** 近似匹配：忽略大小写与空白，子串命中即可。 */
const matchesQuery = (values: readonly string[], query: string): boolean => {
  const needle = query.trim().toLowerCase().replace(/\s+/gu, "");

  if (needle.length === 0) {
    return true;
  }

  return values.some((value) => value.toLowerCase().replace(/\s+/gu, "").includes(needle));
};

export const App = () => {
  useAudioPlayback();
  useApplyPreferences();

  const [settingsOpen, setSettingsOpen] = useState(() => new URLSearchParams(window.location.search).get("settings") === "1");
  const [searchQuery, setSearchQuery] = useState("");
  const [directoryPath, setDirectoryPath] = useState<string | null>(() => getDemoDirectoryPath());
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);

  const library = usePlayerStore((state) => state.library);
  const favorites = usePlayerStore((state) => state.favorites);
  const currentTrackId = usePlayerStore((state) => state.currentTrack?.id ?? null);
  const loadLibrary = usePlayerStore((state) => state.loadLibrary);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const playbackStatus = usePlayerStore((state) => state.status);
  const positionSeconds = usePlayerStore((state) => state.positionSeconds);
  const durationSeconds = usePlayerStore((state) => state.durationSeconds);
  const togglePlayback = usePlayerStore((state) => state.togglePlayback);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrevious = usePlayerStore((state) => state.playPrevious);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const hydrateWallpaper = useWallpaperStore((state) => state.hydrate);

  const visibleTracks = useMemo(() => {
    if (searchQuery.trim().length === 0) {
      return library;
    }

    return library.filter((track) => matchesQuery([track.title, track.artist, track.album], searchQuery));
  }, [library, searchQuery]);

  const galleryGroups = useMemo(() => groupTracksForGallery(visibleTracks), [visibleTracks]);

  const favoriteGroupIds = useMemo(() => {
    const favoriteSet = new Set(favorites);

    return galleryGroups
      .filter((group) => group.trackIds.some((trackId) => favoriteSet.has(trackId)))
      .map((group) => group.id);
  }, [favorites, galleryGroups]);

  const scanDirectoryRef = useRef<(path: string) => Promise<void>>(async () => {});

  useSaveSettings(directoryPath);

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

  const scanDirectory = async (nextDirectoryPath: string): Promise<void> => {
    const api = window.arltHifiDesktop;

    if (!api) {
      setScanErrorMessage("当前环境不支持扫描本地文件夹，请在 Electron 桌面应用中使用。");
      return;
    }

    setScanErrorMessage(null);

    try {
      const tracks = await api.scanMusicDirectory(nextDirectoryPath);
      loadLibrary(tracks);
    } catch (error) {
      loadLibrary([]);
      setScanErrorMessage(getErrorMessage(error, "扫描音乐文件夹失败。"));
    }
  };

  useEffect(() => {
    scanDirectoryRef.current = scanDirectory;
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);


  return (
    <div className="app app--gallery">
      <SceneStage
        currentTrackId={currentTrackId}
        durationSeconds={durationSeconds}
        favoriteGroupIds={favoriteGroupIds}
        groups={galleryGroups}
        onNext={playNext}
        onPlayTrack={playTrack}
        onPrev={playPrevious}
        onToggle={togglePlayback}
        playing={playbackStatus === "playing"}
        positionSeconds={positionSeconds}
        tracks={library}
      />

      <div className="gallery-topbar">
        <input
          aria-label="搜索曲目"
          className="gallery-search"
          onChange={(event) => {
            setSearchQuery(event.currentTarget.value);
          }}
          placeholder="搜索专辑 · 艺术家 · 曲目"
          type="search"
          value={searchQuery}
        />
      </div>

        <button
          aria-label="设置"
          className="gallery-settings"
          onClick={() => {
            setSettingsOpen((open) => !open);
          }}
          type="button"
        >
          ⚙
        </button>
      {scanErrorMessage ? <p className="gallery-error">{scanErrorMessage}</p> : null}

      {settingsOpen ? createPortal((
        <div
          className="settings-overlay"
          onClick={() => {
            setSettingsOpen(false);
          }}
          role="presentation"
        >
          <div
            className="settings-overlay__panel"
            onClick={(event) => {
              event.stopPropagation();
            }}
            role="dialog"
          >
            <SettingsOverlay onClose={() => { setSettingsOpen(false); }} />
          </div>
        </div>
      ), document.body) : null}
    </div>
  );
};