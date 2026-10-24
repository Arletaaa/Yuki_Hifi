import type { CSSProperties } from "react";
import { createCoverMediaUrl } from "@arlhifi/shared";
import { cn } from "@arlhifi/ui";
import { getSeedHue } from "../lib/seed";

interface VinylStyle extends CSSProperties {
  readonly "--vinyl-hue": string;
  readonly "--vinyl-hue-2": string;
}

export interface VinylRecordProps {
  readonly coverPath?: string | null;
  readonly isPlaying: boolean;
  readonly seed: string;
  readonly spin: boolean;
  readonly title: string;
}

export const VinylRecord = ({ coverPath = null, isPlaying, seed, spin, title }: VinylRecordProps) => {
  const hue = getSeedHue(seed);
  const style: VinylStyle = {
    "--vinyl-hue": `${hue}`,
    "--vinyl-hue-2": `${(hue + 46) % 360}`
  };

  return (
    <div
      aria-hidden="true"
      className={cn("vinyl", isPlaying && "is-playing", spin && "is-spinning")}
      style={style}
      title={title}
    >
      <div className="vinyl__disc">
        <span className="vinyl__grooves" />
        <span className="vinyl__label">
          {coverPath ? <img alt="" className="vinyl__label-image" src={createCoverMediaUrl(coverPath)} /> : null}
        </span>
        <span className="vinyl__hole" />
      </div>
      <span className="vinyl__tonearm" />
    </div>
  );
};
