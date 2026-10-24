import { Suspense, lazy, useState } from "react";
import type { GalleryGroup } from "../lib/album-groups";
import { Button } from "@arlhifi/ui";
import { sceneStats, useFrameRateSample } from "./perf";
import { isWebGL2Available } from "./webgl";

const CorridorScene = lazy(() => import("./corridor-scene"));

export interface SceneStageProps {
  readonly autoSpin: boolean;
  readonly favoriteGroupIds: readonly string[];
  readonly groups: readonly GalleryGroup[];
  readonly onExit: () => void;
  readonly onOpenGroup: (group: GalleryGroup) => void;
}

/** S2R-0 实验舞台：验证渲染成本、交互手感与降级路径；S2R-1 才接入正式导航。 */
export const SceneStage = ({ autoSpin, favoriteGroupIds, groups, onExit, onOpenGroup }: SceneStageProps) => {
  const [supported] = useState<boolean>(() => isWebGL2Available());
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const sample = useFrameRateSample();

  return (
    <div className="scene-stage">
      <div className="scene-stage__viewport">
        {supported ? (
          <Suspense fallback={<p className="scene-stage__loading">正在初始化渲染器…</p>}>
            <CorridorScene
              autoSpin={autoSpin}
              favoriteGroupIds={favoriteGroupIds}
              groups={groups}
              onHoverChange={setHoverLabel}
              onOpenGroup={onOpenGroup}
            />
          </Suspense>
        ) : (
          <div className="scene-stage__fallback">
            <h1 className="scene-stage__fallback-title">当前环境无法启用 3D 场景</h1>
            <p className="scene-stage__fallback-copy">
              WebGL2 不可用或已被禁用。播放器会继续使用列表视图，功能不受影响。
            </p>
            <Button onClick={onExit} variant="primary">
              返回列表视图
            </Button>
          </div>
        )}
      </div>

      <div className="scene-stage__hud">
        <p className="scene-stage__hud-title">S2R-0 · CD 长廊压测</p>
        <dl className="scene-stage__stats">
          <div>
            <dt>FPS</dt>
            <dd>{sample.fps}</dd>
          </div>
          <div>
            <dt>渲染/秒</dt>
            <dd>{sample.rendersPerSecond}</dd>
          </div>
          <div>
            <dt>Draw calls</dt>
            <dd>{sceneStats.calls}</dd>
          </div>
          <div>
            <dt>三角形</dt>
            <dd>{sceneStats.triangles.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt>纹理</dt>
            <dd>{sceneStats.textures}</dd>
          </div>
          <div>
            <dt>Bay</dt>
            <dd>
              {sceneStats.mountedBays}/{sceneStats.totalBays}
            </dd>
          </div>
          <div>
            <dt>CD</dt>
            <dd>{groups.length}</dd>
          </div>
        </dl>
      </div>

      <div className="scene-stage__actions">
        <Button onClick={onExit} size="sm" variant="ghost">
          返回列表视图
        </Button>
      </div>

      {hoverLabel ? (
        <p className="scene-stage__hint scene-stage__hint--active">{hoverLabel}</p>
      ) : (
        <p className="scene-stage__hint">拖拽平移 · 滚轮推进 · 双击复位 · 点击 CD 播放</p>
      )}
    </div>
  );
};
