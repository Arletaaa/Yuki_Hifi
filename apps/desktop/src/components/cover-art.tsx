import { useState, type CSSProperties } from "react";
import { createCoverMediaUrl } from "@arlhifi/shared";
import { cn } from "@arlhifi/ui";
import { getSeedHue } from "../lib/seed";

interface CoverArtStyle extends CSSProperties {
  readonly "--cover-hue": string;
  readonly "--cover-hue-2": string;
}

export interface CoverArtProps {
  readonly className?: string;
  readonly coverPath?: string | null;
  readonly seed: string;
  readonly title: string;
}

/** 有封面时显示真实封面，加载失败或没有封面时退回确定性占位图形。 */
export const CoverArt = ({ className, coverPath = null, seed, title }: CoverArtProps) => {
  const [failed, setFailed] = useState(false);
  const hue = getSeedHue(seed);
  const style: CoverArtStyle = {
    "--cover-hue": `${hue}`,
    "--cover-hue-2": `${(hue + 46) % 360}`
  };

  return (
    <div aria-hidden="true" className={cn("cover", className)} style={style} title={title}>
      {coverPath && !failed ? (
        <img
          alt=""
          className="cover__image"
          onError={() => {
            setFailed(true);
          }}
          src={createCoverMediaUrl(coverPath)}
        />
      ) : (
        <>
          <span className="cover__groove" />
          <span className="cover__label" />
        </>
      )}
    </div>
  );
};
