import { Music2, Play } from "lucide-react";
import { formatDuration, formatSampleRate, type Track } from "@arlhifi/shared";

interface MusicLibraryProps {
  readonly currentTrackId: string | null;
  readonly directoryPath: string;
  readonly onPlayTrack: (track: Track) => void;
  readonly tracks: readonly Track[];
}

const getQualityLabel = (track: Track): string => {
  const signalParts = [];

  if (track.sampleRateHz > 0) {
    signalParts.push(formatSampleRate(track.sampleRateHz));
  }

  if (track.bitDepth > 0) {
    signalParts.push(`${track.bitDepth}-bit`);
  }

  return signalParts.length > 0 ? signalParts.join(" / ") : "Unknown quality";
};

export const MusicLibrary = ({ currentTrackId, directoryPath, onPlayTrack, tracks }: MusicLibraryProps) => {
  return (
    <section className="library-panel glass-panel">
      <div className="library-header">
        <div className="min-w-0">
          <h3 className="library-title">本地曲库</h3>
          <p className="library-path">{directoryPath}</p>
        </div>
        <div className="library-count">{tracks.length} 首曲目</div>
      </div>

      <div className="library-grid library-columns">
        <span>标题</span>
        <span>艺术家</span>
        <span>专辑</span>
        <span className="track-cell is-right">时长</span>
        <span className="track-cell is-right">音质</span>
      </div>

      <div className="library-scroll">
        {tracks.map((track) => {
          const isCurrentTrack = track.id === currentTrackId;

          return (
            <button
              className={`track-row library-grid${isCurrentTrack ? " is-active" : ""}`}
              key={track.id}
              onClick={() => {
                onPlayTrack(track);
              }}
              type="button"
            >
              <div className="track-identity">
                <div className="cover-art is-small">
                  {isCurrentTrack ? <Play aria-hidden="true" size={17} /> : <Music2 aria-hidden="true" size={17} />}
                </div>
                <div className="min-w-0">
                  <p className="track-title">{track.title}</p>
                  <p className="track-file">{track.filePath}</p>
                </div>
              </div>
              <p className="track-cell is-strong">{track.artist}</p>
              <p className="track-cell">{track.album}</p>
              <p className="track-cell is-right">{formatDuration(track.durationSeconds)}</p>
              <p className="track-cell is-right">{getQualityLabel(track)}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
};
