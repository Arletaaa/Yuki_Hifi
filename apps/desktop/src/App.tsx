import { useEffect, useMemo, useState } from "react";
import type { AppSettings, Track } from "@arlhifi/shared";
import { createPortal } from "react-dom";
import { SettingsOverlay } from "./components/settings-overlay";
import { useApplyPreferences } from "./hooks/use-app-preferences";
import { useSaveSettings } from "./hooks/use-settings-sync";
import { useAudioPlayback } from "./hooks/use-audio-playback";
import { groupTracksForGallery } from "./lib/album-groups";
import { filterTracks } from "./lib/library-filter";
import { SceneStage } from "./scene/scene-stage";
import { usePlayerStore } from "./store/player-store";
import { useSettingsStore } from "./store/settings-store";

const MAX_SEARCH_RESULTS = 8;

export const App = () => {
  useAudioPlayback();
  useApplyPreferences();

  const [settingsOpen, setSettingsOpen] = useState(() => new URLSearchParams(window.location.search).get("settings") === "1");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [focusRequest, setFocusRequest] = useState<{ groupId: string; nonce: number } | null>(null);

  const library = usePlayerStore((state) => state.library);
  const currentTrackId = usePlayerStore((state) => state.currentTrack?.id ?? null);
  const loadLibrary = usePlayerStore((state) => state.loadLibrary);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const librarySort = useSettingsStore((state) => state.librarySort);

  const searchResults = useMemo(() => {
    if (searchQuery.trim().length === 0) {
      return [];
    }

    return filterTracks(library, searchQuery).slice(0, MAX_SEARCH_RESULTS);
  }, [library, searchQuery]);

  const galleryGroups = useMemo(() => groupTracksForGallery(library, librarySort), [library, librarySort]);

  useSaveSettings();

  useEffect(() => {
    const api = window.arltHifiDesktop;

    if (!api) {
      // 网页预览：从 localStorage 恢复上次的设置（含场景预设）。
      const stored = window.localStorage.getItem("arlt-hifi-settings");

      if (stored) {
        try {
          const parsed = JSON.parse(stored) as AppSettings;
          hydrateSettings(parsed);
          usePlayerStore.setState({
            favorites: parsed.favorites,
            playbackMode: parsed.playbackMode === "stop" ? "stop" : "repeat-one",
            volume: parsed.volume
          });
        } catch {
          // 解析失败就保持默认值。
        }
      }

      return;
    }

    let cancelled = false;

    void api.loadSettings().then((settings) => {
      if (cancelled) {
        return;
      }

      hydrateSettings(settings);
      usePlayerStore.setState({
        favorites: settings.favorites,
        playbackMode: settings.playbackMode,
        volume: settings.volume
      });
    });

    // 曲库以主进程的库清单为准：导入过的文件都在 userData/library 下。
    void api.loadLibrary().then((tracks) => {
      if (!cancelled) {
        loadLibrary(tracks);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hydrateSettings, loadLibrary]);

  // 管理窗口修改/删除曲目后，切回主窗口时刷新曲库，避免画廊显示旧数据。
  useEffect(() => {
    const api = window.arltHifiDesktop;

    if (!api) {
      return;
    }

    const refresh = (): void => {
      void api.loadLibrary().then(loadLibrary);
    };

    window.addEventListener("focus", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
    };
  }, [loadLibrary]);

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

  const flyToTrack = (track: Track): void => {
    const group = galleryGroups.find((candidate) => candidate.trackIds.includes(track.id));

    if (!group) {
      return;
    }

    setFocusRequest((current) => ({ groupId: group.id, nonce: (current?.nonce ?? 0) + 1 }));
    setSearchQuery("");
    setActiveResultIndex(0);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveResultIndex((index) => Math.min(index + 1, Math.max(0, searchResults.length - 1)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveResultIndex((index) => Math.max(0, index - 1));
      return;
    }

    if (event.key === "Enter") {
      const target = searchResults[activeResultIndex] ?? searchResults[0];

      if (target) {
        event.preventDefault();
        flyToTrack(target);
      }

      return;
    }

    if (event.key === "Escape") {
      setSearchQuery("");
      setActiveResultIndex(0);
    }
  };

  const showSearchResults = searchQuery.trim().length > 0;

  return (
    <div className="app app--gallery">
      <SceneStage
        currentTrackId={currentTrackId}
        focusGroupId={focusRequest?.groupId ?? null}
        focusNonce={focusRequest?.nonce ?? 0}
        groups={galleryGroups}
        onPlayTrack={playTrack}
        tracks={library}
      />

      <div className="gallery-topbar">
        <input
          aria-activedescendant={
            searchResults.length > 0 ? `gallery-search-result-${activeResultIndex}` : undefined
          }
          aria-autocomplete="list"
          aria-controls="gallery-search-results"
          aria-expanded={showSearchResults}
          aria-label="搜索曲目"
          className="gallery-search"
          onChange={(event) => {
            setSearchQuery(event.currentTarget.value);
            setActiveResultIndex(0);
          }}
          onKeyDown={handleSearchKeyDown}
          placeholder="搜索专辑 · 艺术家 · 曲目"
          role="combobox"
          type="search"
          value={searchQuery}
        />

        {showSearchResults ? (
          <ul aria-label="搜索结果" className="search-results" id="gallery-search-results" role="listbox">
            {searchResults.length === 0 ? (
              <li className="search-results__empty" role="presentation">没有匹配的曲目</li>
            ) : (
              searchResults.map((track, index) => (
                <li
                  aria-selected={index === activeResultIndex}
                  className={`search-results__item${index === activeResultIndex ? " is-active" : ""}`}
                  id={`gallery-search-result-${index}`}
                  key={track.id}
                  onClick={() => {
                    flyToTrack(track);
                  }}
                  onMouseEnter={() => {
                    setActiveResultIndex(index);
                  }}
                  role="option"
                >
                  <span className="search-results__title">{track.title}</span>
                  <span className="search-results__meta">
                    {track.artist} · {track.album}
                  </span>
                </li>
              ))
            )}
          </ul>
        ) : null}
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
