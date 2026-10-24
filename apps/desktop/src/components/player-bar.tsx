import { AlertCircle, Heart, ListMusic, Music2, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume2 } from "lucide-react";
import type { CSSProperties } from "react";
import { formatDuration } from "@arlhifi/shared";
import { usePlayerStore } from "../store/player-store";

type ProgressStyle = CSSProperties & {
  readonly "--progress": string;
};

const getProgressPercent = (positionSeconds: number, durationSeconds: number): number => {
  if (durationSeconds <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (positionSeconds / durationSeconds) * 100));
};

export const PlayerBar = () => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const positionSeconds = usePlayerStore((state) => state.positionSeconds);
  const durationSeconds = usePlayerStore((state) => state.durationSeconds);
  const status = usePlayerStore((state) => state.status);
  const volume = usePlayerStore((state) => state.volume);
  const playbackErrorMessage = usePlayerStore((state) => state.playbackErrorMessage);
  const togglePlayback = usePlayerStore((state) => state.togglePlayback);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrevious = usePlayerStore((state) => state.playPrevious);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const progressStyle: ProgressStyle = {
    "--progress": `${getProgressPercent(positionSeconds, durationSeconds)}%`
  };

  return (
    <footer className="player-bar">
      <div className="player-bar-inner">
        <div className="now-playing">
          <div className="cover-art is-large">
            <Music2 aria-hidden="true" size={28} />
          </div>
          <div className="min-w-0">
            <p className="player-title">{currentTrack?.title ?? "未选择曲目"}</p>
            <p className="player-artist">{currentTrack?.artist ?? "等待导入本地音乐"}</p>
            {playbackErrorMessage ? (
              <p className="player-error">
                <AlertCircle aria-hidden="true" size={14} />
                <span>{playbackErrorMessage}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="player-center">
          <div className="player-controls">
            <button aria-label="随机播放" className="icon-button" type="button">
              <Shuffle aria-hidden="true" size={18} />
            </button>
            <button aria-label="上一首" className="icon-button" onClick={playPrevious} type="button">
              <SkipBack aria-hidden="true" size={18} />
            </button>
            <button aria-label={status === "playing" ? "暂停" : "播放"} className="play-button" onClick={togglePlayback} type="button">
              {status === "playing" ? <Pause aria-hidden="true" size={24} /> : <Play aria-hidden="true" size={24} />}
            </button>
            <button aria-label="下一首" className="icon-button" onClick={playNext} type="button">
              <SkipForward aria-hidden="true" size={18} />
            </button>
            <button aria-label="循环播放" className="icon-button" type="button">
              <Repeat aria-hidden="true" size={18} />
            </button>
          </div>

          <div className="progress-row">
            <span>{formatDuration(positionSeconds)}</span>
            <div aria-label="播放进度" className="progress-track" role="progressbar" style={progressStyle}>
              <div className="progress-fill" />
              <div className="progress-thumb" />
            </div>
            <span>{formatDuration(durationSeconds)}</span>
          </div>
        </div>

        <div className="player-tools">
          <button aria-label="喜欢" className="utility-button" type="button">
            <Heart aria-hidden="true" size={18} />
          </button>
          <button aria-label="播放列表" className="utility-button" type="button">
            <ListMusic aria-hidden="true" size={18} />
          </button>
          <div className="volume-control">
            <Volume2 aria-hidden="true" size={18} />
            <input
              aria-label="音量"
              className="volume-slider"
              max={100}
              min={0}
              onChange={(event) => {
                setVolume(Number(event.currentTarget.value));
              }}
              type="range"
              value={volume}
            />
            <span className="volume-value">{volume}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
