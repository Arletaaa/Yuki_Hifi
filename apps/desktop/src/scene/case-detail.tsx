import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Group, MathUtils } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { buildCaseModel, CASE_MODEL_URL } from "./case-model";
import { useCoverTexture } from "./cover-textures";

/** 盒盖开合范围：0 = 合上，180° = 完全翻开。 */
const LID_MAX = Math.PI;
/** 松手后的停留位置（半开）。 */
const LID_REST = Math.PI / 2;
/** 绕 +Y 旋转时向外翻开的符号（Blender +90° 外翻 → 这里取反）。 */
const LID_SIGN = -1;
/** 盘片在盒面平面内的可移动范围（模型单位，Y 为高度、Z 为宽度）。 */
const DISC_RANGE_Y = 0.35;
// 模型 +Z 映射到屏幕左侧，所以"向右侧拖动"是负值。
const DISC_RANGE_Z_MIN = -1.15;
const DISC_RANGE_Z_MAX = 0.02;
/** 盘片抓取时离开盒面的距离。 */
const DISC_LIFT = 0.05;

export interface CaseDetailProps {
  readonly coverPath: string | null;
  readonly onPlay: () => void;
  readonly tint: string;
}

type DragMode = "none" | "lid" | "disc";

/**
 * 详情场景：放大的 CD 盒。
 * - 盒子只随鼠标轻微倾斜，不做整圈旋转（保证取出盘片后面向正前方）；
 * - 右半边拖拽 = 开盖（0–180°，松手停半开）；
 * - 开盖后按住盘片拖动：盘片先离开盒面，再在平行于盒面的平面内移动，并限制在不会穿模的范围内。
 */
export const CaseDetail = ({ coverPath, onPlay, tint }: CaseDetailProps) => {
  const texture = useCoverTexture(coverPath);
  const { scene } = useLoader(GLTFLoader, CASE_MODEL_URL);
  const { gl, invalidate } = useThree();
  const built = useMemo(() => buildCaseModel(scene, texture, tint, 1.15, true, false), [scene, texture, tint]);

  const modelRef = useRef<Group>(null);
  const [lidAngle, setLidAngle] = useState(0);
  const [discTaken, setDiscTaken] = useState(false);
  const pointer = useRef({ x: 0, y: 0 });
  const drag = useRef({
    mode: "none" as DragMode,
    lastX: 0,
    lastY: 0,
    lid: 0,
    discY: 0,
    discZ: 0
  });

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (params.get("lid") === "1") {
      drag.current.lid = LID_REST;
      setLidAngle(LID_REST);
    }

    if (params.get("disc") === "1") {
      drag.current.discZ = -0.75;
      drag.current.discY = 0.1;
      setDiscTaken(true);
    }
  }, []);

  useEffect(() => {
    const element = gl.domElement;

    const handleMove = (event: PointerEvent): void => {
      const rect = element.getBoundingClientRect();
      pointer.current.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.current.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

      if (drag.current.mode === "lid") {
        const deltaX = event.clientX - drag.current.lastX;
        drag.current.lastX = event.clientX;
        drag.current.lid = MathUtils.clamp(drag.current.lid + deltaX * 0.012, 0, LID_MAX);
        setLidAngle(drag.current.lid);
      } else if (drag.current.mode === "disc") {
        const deltaX = event.clientX - drag.current.lastX;
        const deltaY = event.clientY - drag.current.lastY;
        drag.current.lastX = event.clientX;
        drag.current.lastY = event.clientY;

        // 屏幕位移 → 盒面内的模型位移（盒宽约 2.2 模型单位 ≈ 420px）。
        drag.current.discZ = MathUtils.clamp(
          drag.current.discZ - deltaX * 0.0052,
          DISC_RANGE_Z_MIN,
          DISC_RANGE_Z_MAX
        );
        drag.current.discY = MathUtils.clamp(drag.current.discY - deltaY * 0.0052, -DISC_RANGE_Y, DISC_RANGE_Y);
      }

      invalidate();
    };

    const handleUp = (): void => {
      if (drag.current.mode === "lid") {
        drag.current.lid = drag.current.lid > 0.35 ? LID_REST : 0;
        setLidAngle(drag.current.lid);
      }

      drag.current.mode = "none";
      invalidate();
    };

    element.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      element.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [gl, invalidate]);

  useFrame((_frame, delta) => {
    const damping = 1 - Math.pow(0.0001, Math.min(delta, 0.1));
    const model = modelRef.current;

    if (model) {
      // 轻微倾斜：只做 ±8°，保证正面对观众。
      const targetY = pointer.current.x * 0.14;
      const targetX = pointer.current.y * -0.09;
      model.rotation.y = MathUtils.lerp(model.rotation.y, targetY, damping);
      model.rotation.x = MathUtils.lerp(model.rotation.x, targetX, damping);
      const scale = MathUtils.lerp(model.scale.x, discTaken ? 1.02 : 1, damping);
      model.scale.setScalar(scale);
    }

    if (built.lidPivot) {
      built.lidPivot.rotation.y = MathUtils.lerp(built.lidPivot.rotation.y, drag.current.lid * LID_SIGN, damping);
    }

    if (built.cd) {
      built.cd.position.x = MathUtils.lerp(built.cd.position.x, discTaken ? DISC_LIFT : 0, damping);
      built.cd.position.y = MathUtils.lerp(built.cd.position.y, drag.current.discY, damping);
      built.cd.position.z = MathUtils.lerp(built.cd.position.z, drag.current.discZ, damping);

      // TODO: 自转需要围绕盘片自身的法线（Object_13 的局部 Y），不能转整个 CD_1 组。
    }

    invalidate();
  });

  return (
    <group
      onPointerDown={(event) => {
        if (lidAngle < 0.3) {
          // 未开盖：右半边拖拽开盖。
          if (event.point.x > 0.05) {
            drag.current.mode = "lid";
            drag.current.lastX = event.clientX;
          }

          return;
        }

        // 已开盖：按住盘片开始拖动（其余位置不响应，避免误触）。
        if (event.point.x < 0.45) {
          drag.current.mode = "disc";
          drag.current.lastX = event.clientX;
          drag.current.lastY = event.clientY;
          setDiscTaken(true);
          onPlay();
        }
      }}
    >
      <group position={[0, 1.22, 0.2]} ref={modelRef}>
        <primitive object={built.root} />
      </group>
    </group>
  );
};
