import type { CSSProperties } from "react";
import { cn } from "@arlhifi/ui";
import { getSeedHue } from "../lib/seed";

interface CoverArtStyle extends CSSProperties {
  readonly "--cover-hue": string;
  readonly "--cover-hue-2": string;
}

export interface CoverArtProps {
  readonly className?: string;
  readonly seed: string;
  readonly title: string;
}

/** 无封面时的确定性占位封面（与曲目 id 绑定，不联网、无资产依赖）。 */
export const CoverArt = ({ className, seed, title }: CoverArtProps) => {
  const hue = getSeedHue(seed);
  const style: CoverArtStyle = {
    "--cover-hue": `${hue}`,
    "--cover-hue-2": `${(hue + 46) % 360}`
  };

  return (
    <div aria-hidden="true" className={cn("cover", className)} style={style} title={title}>
      <span className="cover__groove" />
      <span className="cover__label" />
    </div>
  );
};
