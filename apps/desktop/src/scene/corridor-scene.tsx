import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  InstancedMesh,
  MathUtils,
  MeshStandardMaterial,
  Object3D,
  PMREMGenerator
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { getSeedHue } from "../lib/seed";
import {
  BAY_DEPTH,
  DISC_RADIUS,
  EYE_HEIGHT,
  getBayCount,
  getSlotTransform,
  RACK_X,
  SLEEVE_SIZE,
  SLOTS_PER_BAY
} from "./layout";
import { countRenderedFrame, sceneStats } from "./perf";

const FAVORITE_STEP = 7;
const HOME_Z = 2.6;
const MAX_FORWARD = -(BAY_DEPTH * 40);
const DISC_OFFSET = 0.035;
const VISIBLE_BAY_RADIUS = 2;
const SHELF_HEIGHTS = [0.72, 1.22, 1.72];

interface CorridorSceneProps {
  readonly autoSpin?: boolean;
  readonly trackCount: number;
}

/* ---------- 程序化环境光：不下载 HDRI，也让金属盘面有反射 ---------- */

const ProceduralEnvironment = () => {
  const { gl, scene } = useThree();

  useEffect(() => {
    const generator = new PMREMGenerator(gl);
    const environment = generator.fromScene(new RoomEnvironment(), 0.04);

    scene.environment = environment.texture;
    scene.environmentIntensity = 0.55;

    return () => {
      scene.environment = null;
      environment.dispose();
      generator.dispose();
    };
  }, [gl, scene]);

  return null;
};

/* ---------- 镜头 ---------- */

interface CameraRigProps {
  readonly autoSpin: boolean;
  readonly bayCount: number;
  readonly onCenterBayChange: (bay: number) => void;
}

const CameraRig = ({ autoSpin, bayCount, onCenterBayChange }: CameraRigProps) => {
  const { camera, gl, invalidate } = useThree();
  const state = useRef({
    bay: 0,
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
      const phase = Math.cos(frameState.clock.elapsedTime * 0.35);
      pointer.targetZ = HOME_Z - 3.2 + phase * 2.6;
      invalidate();
    }

    pointer.x = MathUtils.lerp(pointer.x, pointer.targetX, damping);
    pointer.z = MathUtils.lerp(pointer.z, pointer.targetZ, damping);
    pointer.pitch = MathUtils.lerp(pointer.pitch, pointer.targetPitch, damping);

    camera.position.set(pointer.x, EYE_HEIGHT, pointer.z);
    camera.lookAt(pointer.x * 0.35, EYE_HEIGHT + Math.tan(pointer.pitch) * 3.4, pointer.z - 4);

    const nextBay = MathUtils.clamp(Math.round(-pointer.z / BAY_DEPTH), 0, Math.max(bayCount - 1, 0));

    if (nextBay !== pointer.bay) {
      pointer.bay = nextBay;
      onCenterBayChange(nextBay);
    }

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
    <ambientLight intensity={0.32} />
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

/* ---------- 架子：全局实例化，draw call 与 Bay 数无关 ---------- */

const Racks = ({ bays }: { readonly bays: number }) => {
  const shelfRef = useRef<InstancedMesh>(null);
  const panelRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  const shelfCount = bays * 2 * SHELF_HEIGHTS.length;
  const panelCount = bays * 2;

  useLayoutEffect(() => {
    const shelves = shelfRef.current;
    const panels = panelRef.current;

    if (!shelves || !panels) {
      return;
    }

    let shelfIndex = 0;
    let panelIndex = 0;

    for (let bay = 0; bay < bays; bay += 1) {
      const bayZ = -bay * BAY_DEPTH;

      for (const side of [-1, 1]) {
        dummy.position.set(side * (RACK_X + 0.26), 1.45, bayZ);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        panels.setMatrixAt(panelIndex, dummy.matrix);
        panelIndex += 1;

        for (const height of SHELF_HEIGHTS) {
          dummy.position.set(side * (RACK_X - 0.06), height, bayZ);
          dummy.updateMatrix();
          shelves.setMatrixAt(shelfIndex, dummy.matrix);
          shelfIndex += 1;
        }
      }
    }

    shelves.instanceMatrix.needsUpdate = true;
    panels.instanceMatrix.needsUpdate = true;
    shelves.computeBoundingSphere();
    panels.computeBoundingSphere();
  }, [bays, dummy]);

  return (
    <>
      <instancedMesh args={[undefined, undefined, Math.max(shelfCount, 1)]} ref={shelfRef}>
        <boxGeometry args={[0.42, 0.03, BAY_DEPTH]} />
        <meshStandardMaterial color="#232834" metalness={0.35} roughness={0.52} />
      </instancedMesh>

      <instancedMesh args={[undefined, undefined, Math.max(panelCount, 1)]} ref={panelRef}>
        <boxGeometry args={[0.06, 2.3, BAY_DEPTH]} />
        <meshStandardMaterial color="#191d28" metalness={0.3} roughness={0.7} />
      </instancedMesh>
    </>
  );
};

/* ---------- CD：按 Bay 分组，只挂载相机附近的段 ---------- */

interface GalleryResources {
  readonly disc: CylinderGeometry;
  readonly discMaterial: MeshStandardMaterial;
  readonly favoriteMaterial: MeshStandardMaterial;
  readonly normalMaterial: MeshStandardMaterial;
  readonly sleeve: BoxGeometry;
}

const useGalleryResources = (): GalleryResources => {
  const resources = useMemo<GalleryResources>(
    () => ({
      sleeve: new BoxGeometry(SLEEVE_SIZE, SLEEVE_SIZE, 0.04),
      disc: new CylinderGeometry(DISC_RADIUS, DISC_RADIUS, 0.008, 28).rotateX(Math.PI / 2),
      normalMaterial: new MeshStandardMaterial({ color: "#1b2029", metalness: 0.35, roughness: 0.42 }),
      favoriteMaterial: new MeshStandardMaterial({
        color: "#4b3a20",
        emissive: new Color("#c08a34"),
        emissiveIntensity: 0.3,
        metalness: 0.65,
        roughness: 0.28
      }),
      discMaterial: new MeshStandardMaterial({ metalness: 0.8, roughness: 0.24 })
    }),
    []
  );

  useEffect(
    () => () => {
      resources.sleeve.dispose();
      resources.disc.dispose();
      resources.normalMaterial.dispose();
      resources.favoriteMaterial.dispose();
      resources.discMaterial.dispose();
    },
    [resources]
  );

  return resources;
};

interface BayCdsProps {
  readonly absoluteIndices: readonly number[];
  readonly resources: GalleryResources;
}

const BayCds = ({ absoluteIndices, resources }: BayCdsProps) => {
  const normalRef = useRef<InstancedMesh>(null);
  const favoriteRef = useRef<InstancedMesh>(null);
  const discRef = useRef<InstancedMesh>(null);

  const favorites = useMemo(() => absoluteIndices.filter((index) => index % FAVORITE_STEP === 0), [absoluteIndices]);
  const normal = useMemo(() => absoluteIndices.filter((index) => index % FAVORITE_STEP !== 0), [absoluteIndices]);

  useLayoutEffect(() => {
    const dummy = new Object3D();
    const color = new Color();

    const fill = (mesh: InstancedMesh | null, list: readonly number[], mode: "sleeve" | "disc"): void => {
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
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(position, dummy.matrix);

        if (mode === "disc") {
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

    fill(normalRef.current, normal, "sleeve");
    fill(favoriteRef.current, favorites, "sleeve");
    fill(discRef.current, absoluteIndices, "disc");
  }, [absoluteIndices, favorites, normal]);

  return (
    <>
      <instancedMesh
        args={[resources.sleeve, resources.normalMaterial, Math.max(normal.length, 1)]}
        dispose={null}
        ref={normalRef}
      />
      <instancedMesh
        args={[resources.sleeve, resources.favoriteMaterial, Math.max(favorites.length, 1)]}
        dispose={null}
        ref={favoriteRef}
      />
      <instancedMesh
        args={[resources.disc, resources.discMaterial, Math.max(absoluteIndices.length, 1)]}
        dispose={null}
        ref={discRef}
      />
    </>
  );
};

/* ---------- 场景 ---------- */

/** S2R-1a 压测场景：架子全局实例化 + CD 按 Bay 虚拟化。 */
const CorridorScene = ({ autoSpin = false, trackCount }: CorridorSceneProps) => {
  const bays = getBayCount(trackCount);
  const [centerBay, setCenterBay] = useState(0);
  const resources = useGalleryResources();

  const visibleBays = useMemo(() => {
    const from = Math.max(0, centerBay - VISIBLE_BAY_RADIUS);
    const to = Math.min(bays - 1, centerBay + VISIBLE_BAY_RADIUS);

    return Array.from({ length: Math.max(to - from + 1, 1) }, (_unused, offset) => from + offset);
  }, [bays, centerBay]);

  useEffect(() => {
    sceneStats.totalBays = bays;
    sceneStats.mountedBays = visibleBays.length;
  }, [bays, visibleBays.length]);

  return (
    <Canvas
      camera={{ far: 40, fov: 55, near: 0.1, position: [0, EYE_HEIGHT, HOME_Z] }}
      dpr={[1, 1.25]}
      frameloop="demand"
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color args={["#0a0d16"]} attach="background" />
      <fog args={["#0a0d16", 3.5, 20]} attach="fog" />
      <ProceduralEnvironment />
      <Lights />
      <Room bays={bays} />
      <Racks bays={bays} />
      {visibleBays.map((bay) => (
        <BayCds
          absoluteIndices={Array.from(
            { length: Math.min(SLOTS_PER_BAY, Math.max(trackCount - bay * SLOTS_PER_BAY, 0)) },
            (_unused, offset) => bay * SLOTS_PER_BAY + offset
          )}
          key={`bay-${bay}`}
          resources={resources}
        />
      ))}
      <CameraRig autoSpin={autoSpin} bayCount={bays} onCenterBayChange={setCenterBay} />
      <PerfProbe />
    </Canvas>
  );
};

export default CorridorScene;
