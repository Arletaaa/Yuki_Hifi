import { Suspense, lazy, useState } from "react";
import type { Track } from "@arlhifi/shared";
import type { GalleryGroup } from "../lib/album-groups";
import { sceneStats, useFrameRateSample } from "./perf";
import { isWebGL2Available } from "./webgl";

const GalleryExperience = lazy(() =>
  import("./gallery-stage").then((module) => ({ default: module.GalleryExperience }))
);

const SceneLoading = () => (
  <div aria-live="polite" className="scene-stage__loading">
    <span aria-hidden="true" className="scene-stage__loading-disc" />
    <p className="scene-stage__loading-copy">Loading collection</p>
  </div>
);

export interface SceneStageProps {
  readonly currentTrackId: string | null;
  readonly focusGroupId: string | null;
  readonly focusNonce: number;
  readonly groups: readonly GalleryGroup[];
  readonly tracks: readonly Track[];
}

export const SceneStage = ({
  currentTrackId,
  focusGroupId,
  focusNonce,
  groups,
  tracks
}: SceneStageProps) => {
  const [supported] = useState<boolean>(() => isWebGL2Available());
  const [showPerf] = useState<boolean>(
    () => new URLSearchParams(window.location.search).get("perf") === "1"
  );
  const sample = useFrameRateSample();

  return (
    <div className="scene-stage">
      <div className="scene-stage__viewport">
        {supported ? (
          <Suspense fallback={<SceneLoading />}>
            <GalleryExperience
              currentTrackId={currentTrackId}
              focusGroupId={focusGroupId}
              focusNonce={focusNonce}
              groups={groups}
              tracks={tracks}
            />
          </Suspense>
        ) : (
          <div className="scene-stage__fallback">
            <h1 className="scene-stage__fallback-title">无法启用 3D 场景</h1>
            <p className="scene-stage__fallback-copy">当前环境不支持 WebGL2，无法显示 3D 画廊。</p>
          </div>
        )}
      </div>

      {showPerf ? (
        <div className="scene-stage__perf" aria-hidden="true">
          <span>{sample.fps} fps</span>
          <span>{sample.rendersPerSecond} render/s</span>
          <span>{sceneStats.calls} calls</span>
          <span>{sceneStats.triangles} tri</span>
        </div>
      ) : null}
    </div>
  );
};
