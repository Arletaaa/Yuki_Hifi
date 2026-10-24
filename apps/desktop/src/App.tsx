import { FolderSync, Headphones, Library, ListMusic, Settings } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";
import { getSelectedDirectoryPath } from "@arlhifi/shared";
import { EmptyLibrary, type LibraryScanStatus } from "./components/empty-library";
import { HifiPanel } from "./components/hifi-panel";
import { MusicLibrary } from "./components/music-library";
import { PlayerBar } from "./components/player-bar";
import { useAudioPlayback } from "./hooks/use-audio-playback";
import { usePlayerStore } from "./store/player-store";

const navItems = [
  { label: "音乐库", icon: Library },
  { label: "播放队列", icon: ListMusic },
  { label: "设置", icon: Settings }
] as const;

type AmbientStyle = CSSProperties & {
  readonly "--ambient-primary": string;
  readonly "--ambient-secondary": string;
  readonly "--ambient-x": string;
  readonly "--ambient-y": string;
};

const getTrackSeed = (value: string): number =>
  [...value].reduce((total, character) => total + character.charCodeAt(0), 0);

const getAmbientStyle = (trackId: string | null): AmbientStyle => {
  const seed = trackId ? getTrackSeed(trackId) : 37;
  const x = 42 + (seed % 28);
  const y = 18 + (seed % 22);

  return {
    "--ambient-primary": seed % 2 === 0 ? "rgba(255, 132, 178, 0.28)" : "rgba(143, 201, 255, 0.28)",
    "--ambient-secondary": seed % 3 === 0 ? "rgba(158, 232, 210, 0.24)" : "rgba(255, 132, 178, 0.2)",
    "--ambient-x": `${x}%`,
    "--ambient-y": `${y}%`
  };
};

export const App = () => {
  useAudioPlayback();

  const [selectedDirectoryPath, setSelectedDirectoryPath] = useState<string | null>(null);
  const [directoryErrorMessage, setDirectoryErrorMessage] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<LibraryScanStatus>("idle");
  const libraryTracks = usePlayerStore((state) => state.library);
  const currentTrackId = usePlayerStore((state) => state.currentTrack?.id ?? null);
  const loadLibrary = usePlayerStore((state) => state.loadLibrary);
  const playTrack = usePlayerStore((state) => state.playTrack);

  const scanDirectory = async (directoryPath: string): Promise<void> => {
    if (!window.arltHifiDesktop) {
      setDirectoryErrorMessage("当前环境不支持扫描本地文件夹，请在 Electron 桌面应用中使用。");
      setScanStatus("error");
      return;
    }

    setScanStatus("scanning");
    setDirectoryErrorMessage(null);

    try {
      const tracks = await window.arltHifiDesktop.scanMusicDirectory(directoryPath);
      loadLibrary(tracks);
      setScanStatus(tracks.length > 0 ? "success" : "empty");
    } catch (error) {
      const message = error instanceof Error ? error.message : "扫描音乐文件夹失败。";
      loadLibrary([]);
      setDirectoryErrorMessage(message);
      setScanStatus("error");
    }
  };

  const handleSelectDirectory = async (): Promise<void> => {
    if (!window.arltHifiDesktop) {
      setDirectoryErrorMessage("当前环境不支持选择本地文件夹，请在 Electron 桌面应用中使用。");
      setScanStatus("error");
      return;
    }

    setScanStatus("selecting");
    setDirectoryErrorMessage(null);

    try {
      const result = await window.arltHifiDesktop.selectMusicDirectory();
      const directoryPath = getSelectedDirectoryPath(result);

      if (!directoryPath) {
        setScanStatus(libraryTracks.length > 0 ? "success" : selectedDirectoryPath ? "empty" : "idle");
        return;
      }

      setSelectedDirectoryPath(directoryPath);
      await scanDirectory(directoryPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "选择音乐文件夹失败。";
      setDirectoryErrorMessage(message);
      setScanStatus("error");
    }
  };

  const hasTracks = libraryTracks.length > 0;
  const isBusy = scanStatus === "selecting" || scanStatus === "scanning";

  return (
    <main className="app-shell" style={getAmbientStyle(currentTrackId)}>
      <div className="app-layout">
        <aside className="sidebar glass-panel">
          <div className="brand">
            <div className="brand-mark">
              <Headphones aria-hidden="true" size={22} />
            </div>
            <div>
              <h1 className="brand-title">Arlt HiFi</h1>
              <p className="brand-subtitle">Local HiFi Player</p>
            </div>
          </div>

          <nav aria-label="播放器导航" className="nav-list">
            {navItems.map((item, index) => (
              <button className={`nav-button${index === 0 ? " is-active" : ""}`} key={item.label} type="button">
                <item.icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="playlist-card">
            <p className="playlist-label">当前空间</p>
            <p className="playlist-title">{hasTracks ? `${libraryTracks.length} 首本地曲目` : "等待导入音乐"}</p>
          </div>
        </aside>

        <section className="content-shell">
          <div className="content-panel glass-panel">
            <div className="content-header">
              <div>
                <p className="eyebrow">Local HiFi Library</p>
                <h2 className="page-title">音乐库</h2>
              </div>
              <button
                className="primary-action"
                disabled={isBusy}
                onClick={() => {
                  void handleSelectDirectory();
                }}
                type="button"
              >
                <FolderSync aria-hidden="true" size={17} />
                {hasTracks ? "重新选择目录" : "选择目录"}
              </button>
            </div>
            {hasTracks && selectedDirectoryPath ? (
              <MusicLibrary
                currentTrackId={currentTrackId}
                directoryPath={selectedDirectoryPath}
                onPlayTrack={playTrack}
                tracks={libraryTracks}
              />
            ) : (
              <EmptyLibrary
                directoryPath={selectedDirectoryPath}
                errorMessage={directoryErrorMessage}
                onSelectDirectory={() => {
                  void handleSelectDirectory();
                }}
                scanStatus={scanStatus}
              />
            )}
          </div>
        </section>
      </div>
      <PlayerBar />
      <HifiPanel />
    </main>
  );
};
