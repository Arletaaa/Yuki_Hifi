import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Color, CylinderGeometry, InstancedMesh, MathUtils, Object3D } from "three";
import { getSeedHue } from "../lib/seed";
import {
  BAY_DEPTH,
  DISC_RADIUS,
  EYE_HEIGHT,
  getBayCount,
  getSlotTransform,
  RACK_X,
  SLEEVE_SIZE
} from "./layout";
import { countRenderedFrame, sceneStats } from "./perf";

const FAVORITE_STEP = 7;
const HOME_Z = 2.6;
const MAX_FORWARD = -(BAY_DEPTH * 12);
const DISC_OFFSET = 0.035;

interface CorridorSceneProps {
  readonly autoSpin?: boolean;
  readonly trackCount: number;
}

const CameraRig = ({ autoSpin }: { readonly autoSpin: boolean }) => {
  const { camera, gl, invalidate } = useThree();
  const state = useRef({
    dragging: false,
    lastX: 0,
    lastY: 0,
    pitch: 0,
    targetPitch: 0,
    targetX: 0,
    targetZ: HOME_Z,
    x: 0,
    z: HOME_Z
  });

  useEffect(() => {
    const element = gl.domElement;
    const pointer = state.current;

    const handlePointerDown = (event: PointerEvent): void => {
      pointer.dragging = true;
      pointer.lastX = event.clientX;
      pointer.lastY = event.clientY;
      element.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent): void => {
      if (!pointer.dragging) {
        return;
      }

      const deltaX = event.clientX - pointer.lastX;
      const deltaY = event.clientY - pointer.lastY;
      pointer.lastX = event.clientX;
      pointer.lastY = event.clientY;
      pointer.targetX = MathUtils.clamp(pointer.targetX - deltaX * 0.004, -0.9, 0.9);
      pointer.targetPitch = MathUtils.clamp(pointer.targetPitch - deltaY * 0.002, -0.26, 0.26);
      invalidate();
    };

    const handlePointerUp = (event: PointerEvent): void => {
      pointer.dragging = false;

      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
    };

    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();
      pointer.targetZ = MathUtils.clamp(pointer.targetZ + event.deltaY * 0.0025, MAX_FORWARD, HOME_Z);
      invalidate();
    };

    const handleDoubleClick = (): void => {
      pointer.targetX = 0;
      pointer.targetPitch = 0;
      pointer.targetZ = HOME_Z;
      invalidate();
    };

    element.addEventListener("pointerdown", handlePointerDown);
    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerup", handlePointerUp);
    element.addEventListener("pointercancel", handlePointerUp);
    element.addEventListener("wheel", handleWheel, { passive: false });
    element.addEventListener("dblclick", handleDoubleClick);

    return () => {
      element.removeEventListener("pointerdown", handlePointerDown);
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerup", handlePointerUp);
      element.removeEventListener("pointercancel", handlePointerUp);
      element.removeEventListener("wheel", handleWheel);
      element.removeEventListener("dblclick", handleDoubleClick);
    };
  }, [gl, invalidate]);

  useFrame((frameState, delta) => {
    const pointer = state.current;
    const damping = 1 - Math.pow(0.0001, Math.min(delta, 0.1));

    if (autoSpin) {
      // 压测模式：镜头沿走廊持续往返，保证渲染循环满载，fps 读数才有意义。
      const phase = Math.cos(frameState.clock.elapsedTime * 0.35);
      pointer.targetZ = HOME_Z - 3.2 + phase * 2.6;
      invalidate();
    }

    pointer.x = MathUtils.lerp(pointer.x, pointer.targetX, damping);
    pointer.z = MathUtils.lerp(pointer.z, pointer.targetZ, damping);
    pointer.pitch = MathUtils.lerp(pointer.pitch, pointer.targetPitch, damping);

    camera.position.set(pointer.x, EYE_HEIGHT, pointer.z);
    camera.lookAt(pointer.x * 0.35, EYE_HEIGHT + Math.tan(pointer.pitch) * 3.4, pointer.z - 4);

    const settled =
      Math.abs(pointer.x - pointer.targetX) < 0.002 &&
      Math.abs(pointer.z - pointer.targetZ) < 0.002 &&
      Math.abs(pointer.pitch - pointer.targetPitch) < 0.002;

    if (!settled) {
      invalidate();
    }
  });

  return null;
};

const PerfProbe = () => {
  const { gl, invalidate } = useThree();

  useEffect(() => {
    // 挂载后再渲染一帧，让统计探针能捕获首帧数据（惰性渲染下不会自然发生）。
    const timer = window.setTimeout(() => {
      invalidate();
    }, 180);

    return () => {
      window.clearTimeout(timer);
    };
  }, [invalidate]);

  useFrame(() => {
    const info = gl.info;

    sceneStats.calls = info.render.calls;
    sceneStats.triangles = info.render.triangles;
    sceneStats.textures = info.memory.textures;
    countRenderedFrame();
  });

  return null;
};

const Lights = () => (
  <>
    <ambientLight intensity={0.45} />
    <directionalLight color="#ffe9f2" intensity={1.05} position={[2.6, 4, 3]} />
    <pointLight color="#ff7aa8" decay={2} distance={7} intensity={8} position={[0, 2.35, 1.2]} />
    <pointLight color="#78d8ff" decay={2} distance={10} intensity={7} position={[0, 2.1, -BAY_DEPTH * 2]} />
  </>
);

const Room = ({ bays }: { readonly bays: number }) => {
  const length = bays * BAY_DEPTH + 2;

  return (
    <>
      <mesh position={[0, 0, -length / 2 + 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, length + 8]} />
        <meshStandardMaterial color="#0d1017" metalness={0.4} roughness={0.66} />
      </mesh>
      <mesh position={[0, 1.6, -length]}>
        <boxGeometry args={[7, 3.4, 0.12]} />
        <meshStandardMaterial color="#11151f" metalness={0.2} roughness={0.85} />
      </mesh>
    </>
  );
};

const Racks = ({ bays }: { readonly bays: number }) => {
  const shelfHeights = [0.72, 1.22, 1.72];
  const shelfWidth = 0.42;

  return (
    <group>
      {Array.from({ length: bays }, (_unused, bay) => (
        <group key={`bay-${bay}`} position={[0, 0, -bay * BAY_DEPTH]}>
          {[-1, 1].map((side) => (
            <group key={`rack-${side}`}>
              <mesh position={[side * (RACK_X + 0.26), 1.45, 0]}>
                <boxGeometry args={[0.06, 2.3, BAY_DEPTH]} />
                <meshStandardMaterial color="#191d28" metalness={0.25} roughness={0.8} />
              </mesh>
              {shelfHeights.map((height) => (
                <mesh key={`shelf-${side}-${height}`} position={[side * (RACK_X - 0.06), height, 0]}>
                  <boxGeometry args={[shelfWidth, 0.03, BAY_DEPTH]} />
                  <meshStandardMaterial color="#232834" metalness={0.3} roughness={0.6} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      ))}
    </group>
  );
};

const CdInstances = ({ trackCount }: CorridorSceneProps) => {
  const normalRef = useRef<InstancedMesh>(null);
  const favoriteRef = useRef<InstancedMesh>(null);
  const discRef = useRef<InstancedMesh>(null);

  const indices = useMemo(() => Array.from({ length: trackCount }, (_unused, index) => index), [trackCount]);
  const favorites = useMemo(() => indices.filter((index) => index % FAVORITE_STEP === 0), [indices]);
  const normal = useMemo(() => indices.filter((index) => index % FAVORITE_STEP !== 0), [indices]);

  const discGeometry = useMemo(() => new CylinderGeometry(DISC_RADIUS, DISC_RADIUS, 0.008, 48).rotateX(Math.PI / 2), []);

  useEffect(
    () => () => {
      discGeometry.dispose();
    },
    [discGeometry]
  );

  useLayoutEffect(() => {
    const dummy = new Object3D();
    const color = new Color();

    const apply = (mesh: InstancedMesh | null, list: readonly number[], mode: "sleeve" | "disc"): void => {
      if (!mesh) {
        return;
      }

      list.forEach((index, position) => {
        const { position: slot, rotationY } = getSlotTransform(index);
        const offset =
          mode === "disc"
            ? { x: Math.sin(rotationY) * DISC_OFFSET, z: Math.cos(rotationY) * DISC_OFFSET }
            : { x: 0, z: 0 };

        dummy.position.set(slot[0] + offset.x, slot[1], slot[2] + offset.z);
        dummy.rotation.set(0, rotationY, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(position, dummy.matrix);

        if (mode === "disc") {
          // 盘面承载"封面"的角色：用曲目 id 的确定性色相代替真实封面（S5 接入封面纹理）。
          color.setHSL(getSeedHue(`track-${index}`) / 360, 0.62, 0.56);
          mesh.setColorAt(position, color);
        }
      });

      mesh.instanceMatrix.needsUpdate = true;

      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }

      mesh.computeBoundingSphere();
    };

    apply(normalRef.current, normal, "sleeve");
    apply(favoriteRef.current, favorites, "sleeve");
    apply(discRef.current, indices, "disc");
  }, [favorites, indices, normal]);

  return (
    <>
      <instancedMesh
        key={`normal-${normal.length}`}
        args={[undefined, undefined, Math.max(normal.length, 1)]}
        ref={normalRef}
      >
        <boxGeometry args={[SLEEVE_SIZE, SLEEVE_SIZE, 0.04]} />
        <meshStandardMaterial color="#1b2029" metalness={0.25} roughness={0.5} />
      </instancedMesh>

      <instancedMesh
        key={`favorite-${favorites.length}`}
        args={[undefined, undefined, Math.max(favorites.length, 1)]}
        ref={favoriteRef}
      >
        <boxGeometry args={[SLEEVE_SIZE, SLEEVE_SIZE, 0.04]} />
        <meshStandardMaterial
          color="#4b3a20"
          emissive="#c08a34"
          emissiveIntensity={0.28}
          metalness={0.55}
          roughness={0.32}
        />
      </instancedMesh>

      <instancedMesh
        key={`disc-${indices.length}`}
        args={[discGeometry, undefined, Math.max(indices.length, 1)]}
        ref={discRef}
      >
        <meshStandardMaterial roughness={0.3} metalness={0.35} />
      </instancedMesh>
    </>
  );
};

/** S2R-0 压测场景：一条 60 张 CD 的长廊，验证渲染成本与降级路径。 */
const CorridorScene = ({ autoSpin = false, trackCount }: CorridorSceneProps) => {
  const bays = getBayCount(trackCount);

  return (
    <Canvas
      camera={{ far: 40, fov: 55, near: 0.1, position: [0, EYE_HEIGHT, HOME_Z] }}
      dpr={[1, 1.25]}
      frameloop="demand"
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color args={["#0a0d16"]} attach="background" />
      <fog args={["#0a0d16", 3.5, 20]} attach="fog" />
      <Lights />
      <Room bays={bays} />
      <Racks bays={bays} />
      <CdInstances trackCount={trackCount} />
      <CameraRig autoSpin={autoSpin} />
      <PerfProbe />
    </Canvas>
  );
};

export default CorridorScene;
