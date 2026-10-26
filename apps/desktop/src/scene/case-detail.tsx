import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Group, MathUtils } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { buildCaseModel, CASE_MODEL_URL } from "./case-model";
import { useCoverTexture } from "./cover-textures";

const LID_HALF_OPEN = 1.3;
const LID_MAX = 2.6;

export interface CaseDetailProps {
  readonly coverPath: string | null;
  readonly onPlay: () => void;
  readonly tint: string;
}

type DragMode = "none" | "lid" | "case";

/**
 * 详情场景：放大的 CD 盒。
 * - 右半边拖拽 = 开盖（松手停在半开）；其余区域拖拽 = 旋转整盒；
 * - 悬停放大前移；
 * - 开盖后点击盘片 = 盘片移出并自转，同时开始播放。
 */
export const CaseDetail = ({ coverPath, onPlay, tint }: CaseDetailProps) => {
  const texture = useCoverTexture(coverPath);
  const { scene } = useLoader(GLTFLoader, CASE_MODEL_URL);
  const invalidate = useThree((state) => state.invalidate);
  const built = useMemo(() => buildCaseModel(scene, texture, tint, 1.15, true), [scene, texture, tint]);

  const modelRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const [discOut, setDiscOut] = useState(false);
  const drag = useRef({ mode: "none" as DragMode, lastX: 0, moved: 0, lidTarget: 0, caseRotation: 0 });

  useEffect(() => {
    // 开发预览：?lid=1 直接半开，?disc=1 直接移出盘片，便于截图核对。
    if (!import.meta.env.DEV) {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (params.get("lid") === "1") {
      drag.current.lidTarget = LID_HALF_OPEN;
    }

    if (params.get("disc") === "1") {
      setDiscOut(true);
    }
  }, []);

  useFrame((_frame, delta) => {
    const damping = 1 - Math.pow(0.0001, Math.min(delta, 0.1));
    const model = modelRef.current;

    if (model) {
      model.rotation.y = MathUtils.lerp(model.rotation.y, drag.current.caseRotation, damping);
      const scale = MathUtils.lerp(model.scale.x, hovered ? 1.06 : 1, damping);
      model.scale.setScalar(scale);
      model.position.z = MathUtils.lerp(model.position.z, 0.2 + (hovered ? 0.22 : 0), damping);
    }

    if (built.lidPivot) {
      built.lidPivot.rotation.y = MathUtils.lerp(built.lidPivot.rotation.y, drag.current.lidTarget, damping);
    }

    if (built.cd) {
      // 模型空间 +X 是盒外方向；wrapper 已把它映射到 +Z（朝观众）。
      built.cd.position.x = MathUtils.lerp(built.cd.position.x, discOut ? 0.30 : 0, damping);

      if (discOut) {
        built.cd.rotation.y += delta * 2.2;
      }
    }

    invalidate();
  });

  return (
    <group
      onPointerDown={(event) => {
        drag.current.mode = event.point.x > 0 ? "lid" : "case";
        drag.current.lastX = event.clientX;
        drag.current.moved = 0;
      }}
      onPointerMove={(event) => {
        if (drag.current.mode === "none") {
          return;
        }

        const deltaX = event.clientX - drag.current.lastX;
        drag.current.lastX = event.clientX;
        drag.current.moved += Math.abs(deltaX);

        if (drag.current.mode === "lid") {
          drag.current.lidTarget = MathUtils.clamp(drag.current.lidTarget + deltaX * 0.012, 0, LID_MAX);
        } else {
          drag.current.caseRotation += deltaX * 0.006;
        }

        invalidate();
      }}
      onPointerOut={() => {
        setHovered(false);
        drag.current.mode = "none";
      }}
      onPointerOver={() => {
        setHovered(true);
      }}
      onPointerUp={() => {
        const wasLid = drag.current.mode === "lid";
        const moved = drag.current.moved;
        drag.current.mode = "none";

        if (wasLid) {
          const nextOpen = drag.current.lidTarget > 0.4;
          drag.current.lidTarget = nextOpen ? LID_HALF_OPEN : 0;

          if (moved < 4 && nextOpen) {
            setDiscOut((current) => {
              const next = !current;

              if (next) {
                onPlay();
              }

              return next;
            });
          }
        }

        invalidate();
      }}
    >
      <group position={[0, 1.22, 0.2]} ref={modelRef}>
        <primitive object={built.root} />
      </group>
    </group>
  );
};