import {
  AlertCircle,
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX
} from "lucide-react";
import type { CSSProperties } from "react";
import type { PlaybackMode } from "@arlhifi/shared";
import { formatBitDepth, formatDuration, formatSampleRate, getAudioFormatLabel, getQualityLabel } from "@arlhifi/shared";
import { IconButton, Knob } from "@arlhifi/ui";
import { seekTo } from "../hooks/audio-controller";
import { useEffectiveMotionTier } from "../hooks/use-app-preferences";
import { usePlayerStore } from "../store/player-store";
import { VinylRecord } from "./vinyl-record";

const getProgressPercent = (positionSeconds: number, durationSeconds: number): number => {
  if (durationSeconds <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (positionSeconds / durationSeconds) * 100));
};

interface SeekStyle extends CSSProperties {
  readonly "--progress": string;
}

const modeMeta: Record<PlaybackMode, { readonly icon: typeof Repeat; readonly label: string }> = {
  sequential: { label: "顺序播放", icon: Repeat },
  "repeat-one": { label: "单曲循环", icon: Repeat1 },
  shuffle: { label: "随机播放", icon: Shuffle }
};

export interface PlayerBarProps {
  readonly onOpenQueue: () => void;
}

export const PlayerBar = ({ onOpenQueue }: PlayerBarProps) => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const status = usePlayerStore((state) => state.status);
  const positionSeconds = usePlayerStore((state) => state.positionSeconds);
  const durationSeconds = usePlayerStore((state) => state.durationSeconds);
  const volume = usePlayerStore((state) => state.volume);
  const muted = usePlayerStore((state) => state.muted);
  const toggleMute = usePlayerStore((state) => state.toggleMute);
  const playbackMode = usePlayerStore((state) => state.playbackMode);
  const playbackErrorMessage = usePlayerStore((state) => state.playbackErrorMessage);
  const togglePlayback = usePlayerStore((state) => state.togglePlayback);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrevious = usePlayerStore((state) => state.playPrevious);
  const cyclePlaybackMode = usePlayerStore((state) => state.cyclePlaybackMode);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const motionTier = useEffectiveMotionTier();
  const favorites = usePlayerStore((state) => state.favorites);
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);

  const isPlaying = status === "playing";
  const isFavorite = currentTrack ? favorites.includes(currentTrack.id) : false;
  const progressPercent = getProgressPercent(positionSeconds, durationSeconds);
  const ModeIcon = modeMeta[playbackMode].icon;
  const formatLabel = currentTrack ? getAudioFormatLabel(currentTrack.filePath) : "—";

  return (
    <footer className="bar">
      <div className="bar__now">
        <VinylRecord
          coverPath={currentTrack?.coverPath ?? null}
          isPlaying={isPlaying}
          seed={currentTrack?.id ?? "arlt-hifi-idle"}
          spin={isPlaying && motionTier === "rich"}
          title={currentTrack?.title ?? "未选择曲目"}
        />
        <div className="bar__meta" key={currentTrack?.id ?? "idle"}>
          <p className="bar__title">{currentTrack?.title ?? "未选择曲目"}</p>
          <p className="bar__subtitle">
            {currentTrack ? `${currentTrack.artist} · ${currentTrack.album}` : "从音乐库选择一首本地曲目开始"}
          </p>
          {playbackErrorMessage ? (
            <p className="bar__error">
              <AlertCircle aria-hidden="true" size={13} />
              <span>{playbackErrorMessage}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="bar__center">
        <div className="bar__transport">
          <IconButton
            active={playbackMode !== "sequential"}
            label={`播放模式：${modeMeta[playbackMode].label}（点击切换）`}
            onClick={cyclePlaybackMode}
          >
            <ModeIcon aria-hidden="true" size={17} />
          </IconButton>
          <IconButton
            disabled={!currentTrack}
            label="上一首（播放超过 3 秒时回到本曲开头）"
            onClick={() => {
              if (positionSeconds > 3) {
                seekTo(0);
                return;
              }

              playPrevious();
            }}
          >
            <SkipBack aria-hidden="true" size={18} />
          </IconButton>
          <button
            aria-label={isPlaying ? "暂停" : "播放"}
            className="bar__play"
            onClick={togglePlayback}
            type="button"
          >
            {isPlaying ? <Pause aria-hidden="true" size={20} /> : <Play aria-hidden="true" size={20} />}
          </button>
          <IconButton disabled={!currentTrack} label="下一首" onClick={playNext}>
            <SkipForward aria-hidden="true" size={18} />
          </IconButton>
          <IconButton label="打开播放队列" onClick={onOpenQueue}>
            <ListMusic aria-hidden="true" size={17} />
          </IconButton>
        </div>

        <div className="bar__progress">
          <span className="bar__time">{formatDuration(positionSeconds)}</span>
          <input
            aria-label="播放进度"
            className="bar__seek"
            disabled={durationSeconds <= 0}
            max={Math.max(durationSeconds, 1)}
            min={0}
            onChange={(event) => {
              seekTo(Number(event.currentTarget.value));
            }}
            style={{ "--progress": `${progressPercent}%` } as SeekStyle}
            type="range"
            value={Math.min(positionSeconds, Math.max(durationSeconds, 1))}
          />
          <span className="bar__time">{formatDuration(durationSeconds)}</span>
        </div>
      </div>

      <div className="bar__tools">
        <IconButton
          active={isFavorite}
          disabled={!currentTrack}
          label={isFavorite ? "取消收藏" : "收藏当前曲目"}
          onClick={() => {
            if (currentTrack) {
              toggleFavorite(currentTrack.id);
            }
          }}
        >
          <Heart aria-hidden="true" fill={isFavorite ? "currentColor" : "none"} size={17} />
        </IconButton>
        <div className="signal" title="格式来自文件扩展名；采样率与位深需标签解析后填充">
          <span className="signal__format">{formatLabel}</span>
          <span className="signal__value">{currentTrack ? formatSampleRate(currentTrack.sampleRateHz) : "—"}</span>
          <span className="signal__value">{currentTrack ? formatBitDepth(currentTrack.bitDepth) : "—"}</span>
          <span className="signal__quality">{currentTrack ? getQualityLabel(currentTrack.quality) : ""}</span>
        </div>
        <IconButton active={muted} label={muted ? "取消静音" : "静音"} onClick={toggleMute}>
          {muted ? <VolumeX aria-hidden="true" size={17} /> : <Volume2 aria-hidden="true" size={17} />}
        </IconButton>
        <div className="bar__volume">
          <Knob label="音量" onChange={setVolume} value={volume} />
          <span className="bar__volume-value">{volume}</span>
        </div>
      </div>
    </footer>
  );
};
