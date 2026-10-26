import { Suspense, lazy, useState } from "react";
import type { Track } from "@arlhifi/shared";
import type { GalleryGroup } from "../lib/album-groups";
import { sceneStats, useFrameRateSample } from "./perf";
import { isWebGL2Available } from "./webgl";

const GalleryExperience = lazy(() =>
  import("./gallery-stage").then((module) => ({ default: module.GalleryExperience }))
);

export interface SceneStageProps {
  readonly currentTrackId: string | null;
  readonly durationSeconds: number;
  readonly favoriteGroupIds: readonly string[];
  readonly groups: readonly GalleryGroup[];
  readonly onNext: () => void;
  readonly onPlayTrack: (track: Track) => void;
  readonly onPrev: () => void;
  readonly onToggle: () => void;
  readonly playing: boolean;
  readonly positionSeconds: number;
  readonly tracks: readonly Track[];
}

export const SceneStage = ({
  currentTrackId,
  durationSeconds,
  favoriteGroupIds,
  groups,
  onNext,
  onPlayTrack,
  onPrev,
  onToggle,
  playing,
  positionSeconds,
  tracks
}: SceneStageProps) => {
  const [supported] = useState<boolean>(() => isWebGL2Available());
  const sample = useFrameRateSample();

  return (
    <div className="scene-stage">
      <div className="scene-stage__viewport">
        {supported ? (
          <Suspense fallback={null}>
            <GalleryExperience
              currentTrackId={currentTrackId}
              durationSeconds={durationSeconds}
              favoriteGroupIds={favoriteGroupIds}
              groups={groups}
              onNext={onNext}
              onPlayTrack={onPlayTrack}
              onPrev={onPrev}
              onToggle={onToggle}
              playing={playing}
              positionSeconds={positionSeconds}
              tracks={tracks}
            />
          </Suspense>
        ) : (
          <div className="scene-stage__fallback">
            <h1 className="scene-stage__fallback-title">无法启用 3D 场景</h1>
            <p className="scene-stage__fallback-copy">当前环境不支持 WebGL2，已退回列表视图，功能不受影响。</p>

          </div>
        )}
      </div>


    </div>
  );
};
