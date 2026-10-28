import { useFrame, useLoader, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Box3, Group, MathUtils, Object3D, Raycaster, Vector2, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { buildCaseModel, CASE_MODEL_URL } from "./case-model";
import {
  DISC_DRAG_LAMBDA,
  DISC_DRAG_UNITS_PER_PX,
  DISC_HOVER_LAMBDA,
  DISC_LID_LIMIT,
  DISC_LIFT,
  canAccessDisc,
  clampDiscCenter,
  clampDiscOutsideCase,
  discBounds,
  isDiscTouchingCase,
  lidAngleForDrag,
  shouldLiftDisc,
  shouldSnapDisc,
  shouldStartDiscDrag,
  shouldStartLidDrag
} from "./case-interaction";
import { useCoverTexture } from "./cover-textures";
import {
  ENTER_SECONDS,
  INTERACTION_CASE_POSITION,
  RETURN_SECONDS,
  buildClosePlan,
  clamp01,
  closeFrame,
  enterCasePose,
  returnCasePose
} from "./scene-transition";
import type { CasePhase, ClosePlan } from "./scene-transition";

export interface CaseDetailProps {
  readonly coverPath: string | null;
  readonly onClosed: () => void;
  readonly onPlay: () => void;
  readonly phase: CasePhase;
  readonly slotX: number;
  readonly startedAt: number;
  readonly tint: string;
}

type DragMode = "none" | "lid" | "disc";

const isWithin = (node: Object3D, parent: Object3D | null): boolean => {
  let current: Object3D | null = node;

  while (current) {
    if (current === parent) {
      return true;
    }

    current = current.parent;
  }

  return false;
};

/**
 * 详情场景：放大的 CD 盒。
 * - 盒盖右半边向左拖 = 开盖，0–180° 跟手，松手停在原地；
 * - 光盘 hover 时离开卡口，未按住则平滑回位；
 * - 盖子打开到 90° 后才能取盘/放回；光盘移动被限制在铰链线右侧；
 * - 靠近卡口 0.2R 时自动吸附；取出后双击光盘播放；
 * - 返回时先把盘收回、盖合上，再由外层转场把盒子送回槽位。
 */
export const CaseDetail = ({ coverPath, onClosed, onPlay, phase, slotX, startedAt, tint }: CaseDetailProps) => {
  const texture = useCoverTexture(coverPath);
  const { scene } = useLoader(GLTFLoader, CASE_MODEL_URL);
  const { camera, gl } = useThree();
  const built = useMemo(
    () => buildCaseModel(scene, texture, tint, 1.15, true, false, false, true),
    [scene, texture, tint]
  );
  const bounds = useMemo(
    () =>
      built.hinge && built.discHome
        ? discBounds(built.hinge.x, built.discHome.x, built.discHome.y, built.discRadius)
        : null,
    [built.discHome, built.discRadius, built.hinge]
  );
  // 盒面范围（不含打开的盖子）：光盘中心离开这个范围，盖子就可以完全合上。
  const caseBounds = useMemo(() => {
    const wrapper = built.root.children[0];

    return wrapper ? new Box3().setFromObject(wrapper) : null;
  }, [built.root]);

  const outerRef = useRef<Group>(null);
  const modelRef = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const pointerInside = useRef(false);
  const pointerNdc = useRef(new Vector2());
  const raycaster = useRef(new Raycaster());
  const lidAngle = useRef(0);
  const discOffset = useRef(new Vector3());
  const discHovered = useRef(false);
  const discHoverLocked = useRef(false);
  const discHeld = useRef(false);
  const discOut = useRef(false);
  const discLift = useRef(0);
  const drag = useRef({
    mode: "none" as DragMode,
    lastX: 0,
    lastY: 0,
    startX: 0,
    startLid: 0
  });
  const closePlan = useRef<ClosePlan | null>(null);
  const closeStart = useRef(0);
  const closeOffset = useRef(new Vector3());
  const closeReported = useRef(false);
  const interactive = phase === "detail";

  useEffect(() => {
    if (phase !== "closing") {
      closePlan.current = null;
      closeReported.current = false;
      return;
    }

    closePlan.current = buildClosePlan(lidAngle.current, discOut.current);
    closeStart.current = performance.now();
    closeOffset.current.copy(discOffset.current);
    closeReported.current = false;
    drag.current.mode = "none";
    discHeld.current = false;
    discHovered.current = false;
    discHoverLocked.current = true;
  }, [phase]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const lid = Number(params.get("lid"));

    if (Number.isFinite(lid) && lid > 0) {
      lidAngle.current = Math.min(Math.PI, (lid * Math.PI) / 180);
    }

    if (params.get("disc") === "out" || params.get("disc") === "1") {
      discOut.current = true;
      discOffset.current.set(0.42, 0.34, 0);
    }
  }, []);

  useEffect(() => {
    const element = gl.domElement;

    const clampOffset = (): void => {
      if (!bounds || !built.discHome) {
        return;
      }

      const center = clampDiscCenter(
        built.discHome.x + discOffset.current.x,
        built.discHome.y + discOffset.current.y,
        bounds
      );
      const seated =
        !discOut.current &&
        !discHeld.current &&
        !discHovered.current &&
        discLift.current <= 0.01 &&
        discOffset.current.lengthSq() <= 1e-6;

      if (!seated && caseBounds && lidAngle.current < DISC_LID_LIMIT) {
        // 盖子在安全角以下时，盘沿不能进入盒面。
        const outside = clampDiscOutsideCase(
          center.x,
          center.y,
          built.discRadius,
          {
            minX: caseBounds.min.x,
            maxX: caseBounds.max.x,
            minY: caseBounds.min.y,
            maxY: caseBounds.max.y
          },
          bounds
        );

        discOffset.current.set(
          outside.x - built.discHome.x,
          outside.y - built.discHome.y,
          0
        );
        return;
      }

      discOffset.current.set(center.x - built.discHome.x, center.y - built.discHome.y, 0);
    };

    const snapIfPossible = (): boolean => {
      if (
        !built.discHome ||
        !shouldSnapDisc(
          discOffset.current.x,
          discOffset.current.y,
          built.discRadius,
          canAccessDisc(lidAngle.current)
        )
      ) {
        return false;
      }

      discOffset.current.set(0, 0, 0);
      discOut.current = false;
      discHeld.current = false;
      discHovered.current = false;
      // 鼠标可能还停在光盘上；锁定到离开为止，避免刚吸附又弹出来。
      discHoverLocked.current = true;
      drag.current.mode = "none";

      return true;
    };

    const handleMove = (event: PointerEvent): void => {
      if (phase !== "detail") {
        return;
      }

      pointerInside.current = event.target === element;

      const rect = element.getBoundingClientRect();
      pointer.current.x = Math.min(1, Math.max(-1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
      pointer.current.y = Math.min(1, Math.max(-1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));

      if (drag.current.mode === "lid") {
        const seated =
          !discOut.current &&
          !discHeld.current &&
          !discHovered.current &&
          discLift.current <= 0.01 &&
          discOffset.current.lengthSq() <= 1e-6;
        const discCenterX = (built.discHome?.x ?? 0) + discOffset.current.x;
        const discCenterY = (built.discHome?.y ?? 0) + discOffset.current.y;
        const touchingCase = caseBounds
          ? isDiscTouchingCase(discCenterX, discCenterY, built.discRadius, {
              minX: caseBounds.min.x,
              maxX: caseBounds.max.x,
              minY: caseBounds.min.y,
              maxY: caseBounds.max.y
            })
          : true;
        const minAngle =
          !seated && touchingCase && drag.current.startLid >= DISC_LID_LIMIT
            ? DISC_LID_LIMIT
            : 0;

        lidAngle.current = lidAngleForDrag(
          drag.current.startLid,
          event.clientX - drag.current.startX,
          minAngle
        );
      } else if (drag.current.mode === "disc") {
        discOffset.current.x += (event.clientX - drag.current.lastX) * DISC_DRAG_UNITS_PER_PX;
        discOffset.current.y -= (event.clientY - drag.current.lastY) * DISC_DRAG_UNITS_PER_PX;
        drag.current.lastX = event.clientX;
        drag.current.lastY = event.clientY;
        clampOffset();
      }
    };

    const handleUp = (): void => {
      if (phase !== "detail") {
        drag.current.mode = "none";
        return;
      }

      if (drag.current.mode === "disc") {
        discHeld.current = false;
        snapIfPossible();
      }

      drag.current.mode = "none";
    };

    const handleEnter = (): void => {
      pointerInside.current = true;
    };

    const handleLeave = (): void => {
      pointerInside.current = false;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    element.addEventListener("pointerenter", handleEnter);
    element.addEventListener("pointerleave", handleLeave);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      element.removeEventListener("pointerenter", handleEnter);
      element.removeEventListener("pointerleave", handleLeave);
    };
  }, [bounds, built, caseBounds, gl, phase]);

  useFrame((_frame, delta) => {
    const damping = 1 - Math.pow(0.0001, Math.min(delta, 0.1));
    const model = modelRef.current;
    const outer = outerRef.current;
    const now = performance.now();

    if (outer) {
      if (phase === "entering") {
        const pose = enterCasePose(clamp01((now - startedAt) / 1000 / ENTER_SECONDS), slotX);
        outer.position.set(pose.position[0], pose.position[1], pose.position[2]);
        outer.rotation.x = pose.rotationX;
        outer.rotation.y = pose.rotationY;
        outer.scale.setScalar(pose.scale);
      } else if (phase === "returning") {
        const pose = returnCasePose(clamp01((now - startedAt) / 1000 / RETURN_SECONDS), slotX);
        outer.position.set(pose.position[0], pose.position[1], pose.position[2]);
        outer.rotation.x = pose.rotationX;
        outer.rotation.y = pose.rotationY;
        outer.scale.setScalar(pose.scale);
      } else {
        outer.position.set(INTERACTION_CASE_POSITION[0], INTERACTION_CASE_POSITION[1], INTERACTION_CASE_POSITION[2]);
        outer.rotation.x = 0;
        outer.rotation.y = 0;
        outer.scale.setScalar(1);
      }
    }

    if (phase === "closing" && closePlan.current) {
      const frame = closeFrame(closePlan.current, (now - closeStart.current) / 1000);
      lidAngle.current = frame.lidAngle;
      discOffset.current.copy(closeOffset.current).multiplyScalar(1 - frame.discIn);

      if (frame.discIn >= 1) {
        discOffset.current.set(0, 0, 0);
        discOut.current = false;
      }

      if (frame.done) {
        discOut.current = false;
        discHeld.current = false;
        discHovered.current = false;
        discHoverLocked.current = true;

        if (!closeReported.current) {
          closeReported.current = true;
          onClosed();
        }
      }
    }

    if (model) {
      // 轻微倾斜：只做 ±8°，保证正面对观众；非交互阶段回到正面。
      const targetY = interactive ? pointer.current.x * 0.14 : 0;
      const targetX = interactive ? pointer.current.y * -0.09 : 0;
      model.rotation.y = MathUtils.lerp(model.rotation.y, targetY, damping);
      model.rotation.x = MathUtils.lerp(model.rotation.x, targetX, damping);
    }

    if (built.lidPivot) {
      built.lidPivot.rotation.y = -lidAngle.current;
    }

    if (built.discPivot && built.discHome) {
      const lift = shouldLiftDisc({
        canAccess: canAccessDisc(lidAngle.current),
        discHeld: discHeld.current,
        discHovered: discHovered.current,
        discOut: discOut.current,
        hoverLocked: discHoverLocked.current
      });

      discLift.current = MathUtils.damp(discLift.current, lift ? DISC_LIFT : 0, DISC_HOVER_LAMBDA, delta);

      const targetX = built.discHome.x + discOffset.current.x;
      const targetY = built.discHome.y + discOffset.current.y;
      const lambda = discOut.current ? DISC_DRAG_LAMBDA : DISC_HOVER_LAMBDA;

      built.discPivot.position.x = MathUtils.damp(built.discPivot.position.x, targetX, lambda, delta);
      built.discPivot.position.y = MathUtils.damp(built.discPivot.position.y, targetY, lambda, delta);
      built.discPivot.position.z = MathUtils.damp(
        built.discPivot.position.z,
        built.discHome.z + discLift.current,
        DISC_DRAG_LAMBDA,
        delta
      );
    }

    if (interactive && built.cd) {
      pointerNdc.current.set(pointer.current.x, -pointer.current.y);
      raycaster.current.setFromCamera(pointerNdc.current, camera);
      const overDisc =
        pointerInside.current && raycaster.current.intersectObject(built.cd, true).length > 0;

      if (!overDisc) {
        discHovered.current = false;
        discHoverLocked.current = false;
      } else if (
        !discHoverLocked.current &&
        (discOut.current || canAccessDisc(lidAngle.current))
      ) {
        discHovered.current = true;
      }
    } else {
      discHovered.current = false;
      discHoverLocked.current = false;
    }

    const cursor =
      interactive && (drag.current.mode === "lid" || drag.current.mode === "disc")
        ? "grabbing"
        : interactive && discHovered.current
          ? "grab"
          : "default";

    if (gl.domElement.style.cursor !== cursor) {
      gl.domElement.style.cursor = cursor;
    }
  });

  const isRightHalfOfLid = (event: ThreeEvent<PointerEvent>): boolean => {
    if (!built.lidCenter) {
      return false;
    }

    const rect = gl.domElement.getBoundingClientRect();
    const center = built.root.localToWorld(built.lidCenter.clone()).project(camera);
    const centerX = rect.left + (center.x * 0.5 + 0.5) * rect.width;

    return event.nativeEvent.clientX >= centerX;
  };

  const handlePointerDown = (event: ThreeEvent<PointerEvent>): void => {
    if (!interactive) {
      return;
    }

    if (built.lid && isWithin(event.object, built.lid)) {
      if (!shouldStartLidDrag(lidAngle.current, isRightHalfOfLid(event))) {
        return;
      }

      drag.current = {
        mode: "lid",
        lastX: event.clientX,
        lastY: event.clientY,
        startX: event.clientX,
        startLid: lidAngle.current
      };
      event.stopPropagation();
      return;
    }

    if (built.cd && isWithin(event.object, built.cd)) {
      if (!shouldStartDiscDrag(canAccessDisc(lidAngle.current), discOut.current)) {
        return;
      }

      drag.current = {
        mode: "disc",
        lastX: event.clientX,
        lastY: event.clientY,
        startX: event.clientX,
        startLid: lidAngle.current
      };
      discHeld.current = true;
      discOut.current = true;
      discHovered.current = true;
      discHoverLocked.current = false;
      event.stopPropagation();
    }
  };

  const handleDoubleClick = (event: ThreeEvent<MouseEvent>): void => {
    if (!interactive || !built.cd || !isWithin(event.object, built.cd) || !discOut.current) {
      return;
    }

    event.stopPropagation();
    onPlay();
  };

  return (
    <group ref={outerRef}>
      <group ref={modelRef}>
        <primitive
          object={built.root}
          onDoubleClick={handleDoubleClick}
          onPointerDown={handlePointerDown}
        />
      </group>
    </group>
  );
};
