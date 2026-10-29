import { useFrame, useLoader, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { usePlayerStore } from "../store/player-store";
import type { CasePhase } from "./scene-transition";
import {
  ARM_LIFT,
  ARM_PLAY_ANGLE,
  DECK_POSITION,
  DECK_ROTATION_X,
  DECK_ROTATION_Y,
  DECK_SCALE,
  LAMP_OFF,
  SPIN_RAD_PER_SECOND,
  TURNTABLE_MODEL_URL,
  armAngleForDrag,
  leftLampColor,
  rightLampColor,
  shouldDropArm,
  spinRateAfter
} from "./turntable-interaction";
import type { TurntableBridge } from "./turntable-interaction";

export interface TurntableProps {
  readonly bridge: TurntableBridge;
  readonly groupTrackIds: readonly string[];
  readonly onPlay: () => void;
  readonly phase: CasePhase;
}

const findNode = (root: Object3D, name: string): Object3D => {
  const node = root.getObjectByName(name);

  if (!node) {
    throw new Error(`turntable model is missing node "${name}"`);
  }

  return node;
};

/**
 * 交互区右侧的唱片机：
 * - Start/Stop 按钮控制转盘（红/绿灯）；
 * - 拖唱臂到 CD 上开始播放，拖走暂停；
 * - CD 是否在盘上由 CaseDetail 通过 bridge 同步。
 */
export const Turntable = ({ bridge, groupTrackIds, onPlay, phase }: TurntableProps) => {
  const gltf = useLoader(GLTFLoader, TURNTABLE_MODEL_URL);
  const { gl } = useThree();
  const groupRef = useRef<Group>(null);
  const platterRef = useRef<Object3D>(null);
  const armRef = useRef<Object3D>(null);
  const buttonRef = useRef<Object3D>(null);

  const parts = useMemo(() => {
    const root = gltf.scene.clone(true);
    const deck = findNode(root, "Deck");
    const platter = findNode(root, "Platter");
    const arm = findNode(root, "Tonearm");
    const button = findNode(root, "StartStop");
    const lampL = findNode(root, "LampL");
    const lampR = findNode(root, "LampR");

    const lampMaterial = (node: Object3D): MeshStandardMaterial => {
      const material = (node as Mesh).material;

      if (!(material instanceof MeshStandardMaterial)) {
        throw new Error("lamp material is not MeshStandardMaterial");
      }

      const clone = material.clone();
      clone.emissive.setHex(LAMP_OFF);
      clone.emissiveIntensity = 2.2;
      clone.toneMapped = false;
      (node as Mesh).material = clone;

      return clone;
    };

    for (const node of [deck, platter, arm, button]) {
      node.traverse((child) => {
        const mesh = child as Mesh;

        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
    }

    return {
      deck,
      platter,
      arm,
      button,
      lampL,
      lampR,
      lampMaterialL: lampMaterial(lampL),
      lampMaterialR: lampMaterial(lampR)
    };
  }, [gltf.scene]);

  const [motorOn, setMotorOn] = useState(false);
  const [armDown, setArmDown] = useState(false);
  const [draggingArm, setDraggingArm] = useState(false);
  const [cdSeated, setCdSeated] = useState(false);
  const status = usePlayerStore((state) => state.status);
  const playbackMode = usePlayerStore((state) => state.playbackMode);
  const wasPlaying = useRef(false);

  const rateRef = useRef(0);
  const spinRef = useRef(0);
  const armAngleRef = useRef(0);
  const armTargetRef = useRef(0);
  const liftRef = useRef(0);
  const pressRef = useRef(0);
  const dragStart = useRef({ angle: 0, x: 0 });
  const seatedRef = useRef(false);
  const armBaseY = useRef(0);
  const buttonBaseY = useRef(0);

  const statusRef = useRef(status);
  const motorOnRef = useRef(motorOn);
  const armDownRef = useRef(armDown);
  const cdSeatedRef = useRef(cdSeated);
  const phaseRef = useRef(phase);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    motorOnRef.current = motorOn;
  }, [motorOn]);
  useEffect(() => {
    armDownRef.current = armDown;
  }, [armDown]);
  useEffect(() => {
    cdSeatedRef.current = cdSeated;
  }, [cdSeated]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (armRef.current) {
      armBaseY.current = armRef.current.position.y;
    }
    if (buttonRef.current) {
      buttonBaseY.current = buttonRef.current.position.y;
    }
  }, [parts]);

  useLayoutEffect(() => {
    const group = groupRef.current;
    const platter = platterRef.current;

    if (!group || !platter) {
      return;
    }

    group.updateWorldMatrix(true, true);
    const seat = new Vector3();
    platter.localToWorld(seat);
    bridge.platterWorld.copy(seat);
    bridge.platterQuaternion.copy(platter.getWorldQuaternion(new Quaternion()));
  }, [bridge, parts]);

  const requestPlay = useCallback(() => {
    const state = usePlayerStore.getState();

    if (state.status === "playing") {
      return;
    }

    wasPlaying.current = true;

    if (state.currentTrack && groupTrackIds.includes(state.currentTrack.id)) {
      state.togglePlayback();
      return;
    }

    onPlay();
  }, [groupTrackIds, onPlay]);

  const requestPause = useCallback(() => {
    wasPlaying.current = false;

    if (usePlayerStore.getState().status === "playing") {
      usePlayerStore.getState().togglePlayback();
    }
  }, []);

  /** 离开 detail：直接停转、唱臂回架、音频暂停。 */
  useEffect(() => {
    if (phase === "detail") {
      return;
    }

    setDraggingArm(false);
    setArmDown(false);
    setMotorOn(false);
    // 返回时舍弃减速动画：转盘立即停住，CD 直接取下。
    rateRef.current = 0;
    armTargetRef.current = 0;
    requestPause();
  }, [phase, requestPause]);

  /** 播完即停：曲目结束后只停转盘，机头留在盘上。 */
  useEffect(() => {
    if (status === "playing") {
      wasPlaying.current = true;
      return;
    }

    if (status !== "paused" || !wasPlaying.current) {
      return;
    }

    wasPlaying.current = false;

    if (playbackMode === "stop" && armDown && motorOn && cdSeated) {
      setMotorOn(false);
    }
  }, [armDown, cdSeated, motorOn, playbackMode, status]);

  const handleArmPointerDown = (event: ThreeEvent<PointerEvent>): void => {
    if (phase !== "detail") {
      return;
    }

    event.stopPropagation();
    dragStart.current = { angle: armAngleRef.current, x: event.clientX };
    setDraggingArm(true);

    if (armDown) {
      setArmDown(false);
      requestPause();
    }
  };

  useEffect(() => {
    if (!draggingArm) {
      return;
    }

    const handleMove = (event: PointerEvent): void => {
      armTargetRef.current = armAngleForDrag(
        dragStart.current.angle,
        event.clientX - dragStart.current.x
      );
    };

    const handleUp = (): void => {
      setDraggingArm(false);
      const drop = shouldDropArm(armAngleRef.current, cdSeatedRef.current);

      if (drop) {
        armTargetRef.current = ARM_PLAY_ANGLE;
        setArmDown(true);

        if (motorOnRef.current) {
          requestPlay();
        }

        return;
      }

      armTargetRef.current = 0;
      setArmDown(false);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [draggingArm, requestPlay]);

  const handleButtonClick = (event: ThreeEvent<MouseEvent>): void => {
    if (phase !== "detail" || !cdSeated) {
      return;
    }

    event.stopPropagation();
    pressRef.current = 1;
    const next = !motorOn;
    setMotorOn(next);

    if (next) {
      if (armDown) {
        requestPlay();
      }
      return;
    }

    requestPause();
  };

  useFrame((_frame, delta) => {
    const dt = Math.min(delta, 0.1);

    if (seatedRef.current !== bridge.cdSeated) {
      seatedRef.current = bridge.cdSeated;
      setCdSeated(bridge.cdSeated);

      if (!bridge.cdSeated) {
        setMotorOn(false);
        setArmDown(false);
        armTargetRef.current = 0;
        requestPause();
      }
    }

    rateRef.current = spinRateAfter(rateRef.current, motorOn ? 1 : 0, dt);
    spinRef.current = (spinRef.current + rateRef.current * SPIN_RAD_PER_SECOND * dt) % (Math.PI * 2);
    bridge.spinAngle = spinRef.current;
    bridge.spinning = rateRef.current > 0.02;
    bridge.armDown = armDown;

    if (platterRef.current) {
      platterRef.current.rotation.y = spinRef.current;
    }

    armAngleRef.current = MathUtils.damp(armAngleRef.current, armTargetRef.current, 12, dt);
    // 播放时保持抬起高度，不把唱针压到盘面（模型本身的落针位会穿模）。
    liftRef.current = MathUtils.damp(
      liftRef.current,
      draggingArm || armDown ? ARM_LIFT : 0,
      14,
      dt
    );

    if (armRef.current) {
      armRef.current.rotation.y = armAngleRef.current;
      armRef.current.position.y = armBaseY.current + liftRef.current;
    }

    pressRef.current = MathUtils.damp(pressRef.current, 0, 18, dt);

    if (buttonRef.current) {
      buttonRef.current.position.y = buttonBaseY.current - pressRef.current * 0.02;
    }

    const targetL = leftLampColor(cdSeated, motorOn);
    const targetR = rightLampColor(status === "playing");
    parts.lampMaterialL.emissive.lerp(new Color(targetL), 0.2);
    parts.lampMaterialR.emissive.lerp(new Color(targetR), 0.2);
  });

  const cursor = draggingArm ? "grabbing" : "default";

  useEffect(() => {
    gl.domElement.style.cursor = cursor;
  }, [cursor, gl]);

  return (
    <group
      position={[DECK_POSITION[0], DECK_POSITION[1], DECK_POSITION[2]]}
      ref={groupRef}
      rotation={[DECK_ROTATION_X, DECK_ROTATION_Y, 0]}
      scale={DECK_SCALE}
    >
      <primitive object={parts.deck} />
      <primitive object={parts.platter} ref={platterRef} />
      <primitive object={parts.arm} onPointerDown={handleArmPointerDown} ref={armRef} />
      <primitive object={parts.button} onClick={handleButtonClick} ref={buttonRef} />
      <primitive object={parts.lampL} />
      <primitive object={parts.lampR} />
    </group>
  );
};
