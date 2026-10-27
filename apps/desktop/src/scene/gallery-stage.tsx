import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box3, Color, DoubleSide, Group, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, MultiplyBlending, PlaneGeometry, PMREMGenerator, RepeatWrapping, SRGBColorSpace, Texture, TextureLoader, Vector3 } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Track } from "@arlhifi/shared";
import type { GalleryGroup } from "../lib/album-groups";
import { getSeedHue } from "../lib/seed";
import { buildCaseModel, CASE_MODEL_URL } from "./case-model";
import { CaseDetail } from "./case-detail";
import { ContactShadow } from "./contact-shadows";
import { useCoverTexture } from "./cover-textures";
import { countRenderedFrame, sceneStats } from "./perf";
import { useSettingsStore } from "../store/settings-store";
import { DappledLight, LightShafts } from "./light-effects";

/** 程序化环境贴图：透明/金属材质需要可反射的周围环境，否则会是死黑。 */
const ProceduralEnvironment = () => {
  const { gl, scene } = useThree();

  useEffect(() => {
    const generator = new PMREMGenerator(gl);
    const environment = generator.fromScene(new RoomEnvironment(), 0.04);

    scene.environment = environment.texture;
    scene.environmentIntensity = 0.4;

    return () => {
      scene.environment = null;
      environment.dispose();
      generator.dispose();
    };
  }, [gl, scene]);

  return null;
};

const GAP = 0.80;
const DISC_RADIUS = 0.26;
const BASE_Y = 1.30;
const CAMERA_POSITION: readonly [number, number, number] = [0, 1.78, 3.95];
const LOOK_AT: readonly [number, number, number] = [0, 1.30, 0];

/** 编辑体色板：低饱和、成套，避免随机彩虹色。 */
const PALETTE = ["#c96f5a", "#8fa7b8", "#31506b", "#8a9a52", "#c8a06a", "#8c6b86", "#9fb0b8", "#a8563f"];

const tintOf = (id: string): string => PALETTE[getSeedHue(id) % PALETTE.length] ?? PALETTE[0] ?? "#c96f5a";
const VISIBLE = 7;

/** 台面顶面（BASE_Y - 0.26）上方 1.5mm：接触阴影贴片的位置。 */
const CONTACT_SHADOW_Y = -0.2585;

type Stage = "gallery" | "expanded" | "player";

/* ---------- 单张 CD ---------- */

interface DiscProps {
  readonly coverPath: string | null;
  readonly id: string;
  readonly isCurrent: boolean;
  readonly isFavorite: boolean;
  readonly onPointerOverAction?: () => void;
  readonly onSelect: () => void;
  readonly position: readonly [number, number, number];
  readonly rotationY: number;
  readonly scale: number;
  readonly spinning?: boolean;
}

/** 封面（内页）。 */
const COVER_NODE = "Object_11";
/** 托盘上那层印着 CD 图形的纸，会挡住封面。 */
const CD_PRINT_NODES = new Set(["Object_8"]);
/** 盘片本体：陈列时隐藏，点击后再出现。 */
const DISC_NODES = new Set(["Object_13", "Object_14"]);

/** 透明宝石盒（Sketchfab "CD Jewel Case"，作者 蓝人组合，CC-BY 4.0）。 */
const CaseModel = ({ coverTexture, tint }: { readonly coverTexture: Texture | null; readonly tint: string }) => {
  const { scene } = useLoader(GLTFLoader, CASE_MODEL_URL);
  const mergeShell = useMemo(() => new URLSearchParams(window.location.search).get("merge") === "1", []);
  const built = useMemo(() => buildCaseModel(scene, coverTexture, tint, 0.52, false, true, mergeShell), [coverTexture, mergeShell, scene, tint]);

  return <primitive object={built.root} />;
};
const Disc = ({
  coverPath,
  id,
  isCurrent,
  isFavorite,
  onPointerOverAction,
  onSelect,
  position,
  rotationY,
  scale,
  spinning = false
}: DiscProps) => {
  const texture = useCoverTexture(coverPath);
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<Mesh>(null);
  const tint = tintOf(id);

  useFrame((state, delta) => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    const damping = 1 - Math.pow(0.0001, Math.min(delta, 0.1));

    group.position.z = MathUtils.lerp(group.position.z, hovered ? 0.07 : 0, damping);
    group.rotation.y = MathUtils.lerp(group.rotation.y, hovered ? 0.18 : 0, damping);

    if (spinning && meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * -0.35;
    }
  });

  return (
    <group position={[position[0], position[1], position[2]]} rotation={[0, rotationY, 0]}>
      <ContactShadow depth={0.3} width={0.68} y={CONTACT_SHADOW_Y} />
      <mesh
        castShadow
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onPointerOut={() => {
          setHovered(false);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          onPointerOverAction?.();
        }}
        ref={groupRef}
      >
        <CaseModel coverTexture={texture} tint={tint} />


        {isCurrent ? (
          <mesh position={[0, -0.3, 0.045]}>
            <planeGeometry args={[0.3, 0.008]} />
            <meshBasicMaterial color="#ff7aa8" toneMapped={false} />
          </mesh>
        ) : null}
      </mesh>
    </group>
  );
};
/* ---------- 展架 ---------- */

/** 墙面墙皮（Fabric028，CC0）。 */
const WallSurface = () => {
  const preset = useSettingsStore((state) => state.scenePreset);
  const textures = useLoader(TextureLoader, [
    `/textures/wall/${preset.wall}-color.jpg`,
    `/textures/wall/${preset.wall}-normal.jpg`
  ]);
  const [map, normalMap, roughnessMap] = textures;

  useEffect(() => {
    for (const texture of textures) {
      if (!texture) {
        continue;
      }

      texture.anisotropy = 8;
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(26, 2.2);
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }

    if (map) {
      map.colorSpace = SRGBColorSpace;
    }
  }, [map, textures]);

  return (
    <meshStandardMaterial
      color="#9d9186"
      map={map ?? null}
      metalness={0.02}
      roughness={0.92}
    />
  );
};


/** 只有一面墙（详情场景用）。 */
const BackWall = () => (
  <mesh position={[0, BASE_Y + 0.55, -0.34]} receiveShadow>
    <boxGeometry args={[40, 3.4, 0.08]} />
    <WallSurface />
  </mesh>
);

/** 柜体立面（Wood008 竖纹，CC0）。 */
const CabinetSurface = () => {
  const preset = useSettingsStore((state) => state.scenePreset);
  const textures = useLoader(TextureLoader, [
    `/textures/base/${preset.base}-color.jpg`,
    `/textures/base/${preset.base}-normal.jpg`
  ]);
  const [map, normalMap, roughnessMap] = textures;

  useEffect(() => {
    for (const texture of textures) {
      if (!texture) {
        continue;
      }

      texture.anisotropy = 8;
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      // 柜体 40 × 1.2，格子 2m；竖纹材质直接映射为竖向
      texture.repeat.set(20, 0.6);
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }

    if (map) {
      map.colorSpace = SRGBColorSpace;
    }
  }, [map, textures]);

  return (
    <meshStandardMaterial
      color="#c2b09a"
      map={map ?? null}
      metalness={0.05}
      roughness={0.7}
    />
  );
};

/** 台面：真实木纹贴图（ambientCG Wood066，CC0）。 */
const DeskSurface = () => {
  const preset = useSettingsStore((state) => state.scenePreset);
  const textures = useLoader(TextureLoader, [
    `/textures/table/${preset.table}-color.jpg`,
    `/textures/table/${preset.table}-normal.jpg`
  ]);
  const [map, normalMap, roughnessMap] = textures;

  useEffect(() => {
    for (const texture of textures) {
      if (!texture) {
        continue;
      }

      texture.anisotropy = 8;
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      // 台面 40 × 0.62，格子 2m；横向木纹沿台面长边
      texture.repeat.set(20, 0.31);
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }

    if (map) {
      map.colorSpace = SRGBColorSpace;
    }
  }, [map, textures]);

  return (
    <mesh castShadow position={[0, BASE_Y - 0.32, 0.05]} receiveShadow>
      <boxGeometry args={[40, 0.12, 0.62]} />
      <meshStandardMaterial
        map={map ?? null}
        metalness={0.04}
          roughness={0.72}
        />
    </mesh>
  );
};

const Shelf = () => (
  <group>
    {/* 台面：真实木纹 */}
    <DeskSurface />
    <mesh position={[0, BASE_Y - 0.26, 0.36]}>
      <boxGeometry args={[40, 0.02, 0.02]} />
      <meshStandardMaterial color="#c89a68" metalness={0.2} roughness={0.4} emissive="#3a2413" emissiveIntensity={0.4} />
    </mesh>
    {/* 台面下方深色立面 */}
    <mesh position={[0, BASE_Y - 0.95, 0.2]} receiveShadow>
      <boxGeometry args={[40, 1.2, 0.08]} />
      <CabinetSurface />
    </mesh>
    {/* 背墙 */}
    <mesh position={[0, BASE_Y + 0.55, -0.34]} receiveShadow>
      <boxGeometry args={[40, 3.4, 0.08]} />
      <WallSurface />
    </mesh>
  </group>
);

/* ---------- 横向单排 + 无限循环 ---------- */


/** 把渲染器统计写进 sceneStats，并把已绘制帧数交给帧率采样器。 */
const FrameProbe = () => {
  const gl = useThree((state) => state.gl);

  useFrame(() => {
    sceneStats.calls = gl.info.render.calls;
    sceneStats.triangles = gl.info.render.triangles;
    countRenderedFrame();
  });

  return null;
};
const Carousel = ({
  groups,
  currentGroupId,
  favoriteGroupIds,
  onHover,
  onOpen,
  scrollRef
}: {
  readonly currentGroupId: string | null;
  readonly favoriteGroupIds: readonly string[];
  readonly groups: readonly GalleryGroup[];
  readonly onHover: (label: string | null) => void;
  readonly onOpen: (group: GalleryGroup) => void;
  readonly scrollRef: { current: number };
}) => {
  const { gl, invalidate } = useThree();
  const lastScroll = useRef(0);
  const trackRef = useRef<Group>(null);
  const total = groups.length;
  const length = Math.max(total * GAP, GAP);
  const loopable = total > VISIBLE;

  const state = useRef({ dragging: false, lastX: 0, offset: 0, target: 0, velocity: 0 });
  const favoriteSet = useMemo(() => new Set(favoriteGroupIds), [favoriteGroupIds]);

  useEffect(() => {
    const element = gl.domElement;
    const pointer = state.current;

    const handlePointerDown = (event: PointerEvent): void => {
      pointer.dragging = true;
      pointer.lastX = event.clientX;
      pointer.velocity = 0;
      element.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent): void => {
      if (!pointer.dragging) {
        return;
      }

      const deltaX = event.clientX - pointer.lastX;
      pointer.lastX = event.clientX;
      pointer.target += deltaX * 0.006;
      pointer.velocity = deltaX * 0.006;
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
      pointer.target += Math.sign(event.deltaY || event.deltaX) * GAP;
      invalidate();
    };

    element.addEventListener("pointerdown", handlePointerDown);
    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerup", handlePointerUp);
    element.addEventListener("pointercancel", handlePointerUp);
    element.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      element.removeEventListener("pointerdown", handlePointerDown);
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerup", handlePointerUp);
      element.removeEventListener("pointercancel", handlePointerUp);
      element.removeEventListener("wheel", handleWheel);
    };
  }, [gl, invalidate]);

  useFrame((_frame, delta) => {
    const pointer = state.current;
    const damping = 1 - Math.pow(0.0001, Math.min(delta, 0.1));

    if (!pointer.dragging) {
      // 惯性 + 吸附到最近一张
      pointer.target += pointer.velocity;
      pointer.velocity *= 0.9;
      pointer.target = Math.round(pointer.target / GAP) * GAP;
    }

    if (scrollRef.current !== lastScroll.current) {
      pointer.target += (scrollRef.current - lastScroll.current) * GAP;
      lastScroll.current = scrollRef.current;
      invalidate();
    }

    pointer.offset = MathUtils.lerp(pointer.offset, pointer.target, damping);

    // 关键：位移在 useFrame 里直接写到 Object3D 上。
    // 之前用 state 算位置、只在 React 重渲染时更新，导致拖动时画面一顿一顿。
    const track = trackRef.current;

    if (track) {
      const half = length / 2;

      for (let index = 0; index < track.children.length; index += 1) {
        const child = track.children[index];

        if (!child) {
          continue;
        }

        let x = index * GAP + pointer.offset;

        if (loopable) {
          x = (((x + half) % length) + length) % length - half;
        }

        child.position.x = x;
        child.visible = Math.abs(x) <= GAP * (VISIBLE + 1);
      }
    }

    if (Math.abs(pointer.offset - pointer.target) > 0.0005 || Math.abs(pointer.velocity) > 0.0005) {
      invalidate();
    }
  });

  return (
    <group>
      <Shelf />
      <group ref={trackRef}>
        {groups.slice(0, 400).map((group) => (
          <Disc
            coverPath={group.coverPath}
            id={group.id}
            isCurrent={group.id === currentGroupId}
            isFavorite={favoriteSet.has(group.id)}
            key={group.id}
            onPointerOverAction={() => {
              onHover(`${group.artist} · ${group.title}`);
            }}
            onSelect={() => {
              onOpen(group);
            }}
            position={[0, BASE_Y, 0]}
            rotationY={0}
            scale={1}
          />
        ))}
      </group>
    </group>
  );
};
/* ---------- 扇开（组内曲目） ---------- */

const Fan = ({
  group,
  onSelect,
  tracks
}: {
  readonly group: GalleryGroup;
  readonly onSelect: (track: Track) => void;
  readonly tracks: readonly Track[];
}) => {
  const items = group.trackIds
    .map((trackId) => tracks.find((track) => track.id === trackId))
    .filter((track): track is Track => Boolean(track));

  return (
    <group position={[0, BASE_Y, 0.35]}>
      {items.map((track, index) => {
        const center = (items.length - 1) / 2;
        const x = (index - center) * GAP * 0.72;
        const rotation = (index - center) * -0.12;

        return (
          <group key={track.id} position={[x, 0, Math.abs(index - center) * 0.03]} rotation={[0, rotation, 0]}>
            <Disc
              coverPath={track.coverPath ?? group.coverPath}
              id={`${group.id}-${track.id}`}
              isCurrent={false}
              isFavorite={false}
              onSelect={() => {
                onSelect(track);
              }}
              position={[0, 0, 0]}
              rotationY={0}
              scale={1.05}
            />
          </group>
        );
      })}
    </group>
  );
};

/* ---------- 播放台：悬浮 CD + 非文字信息 ---------- */

const PlayerStage = ({
  onNext,
  onPrev,
  onToggle,
  playing,
  progress,
  track
}: {
  readonly onNext: () => void;
  readonly onPrev: () => void;
  readonly onToggle: () => void;
  readonly playing: boolean;
  readonly progress: number;
  readonly track: Track | null;
}) => {
  const texture = useCoverTexture(track?.coverPath ?? null);
  const groupRef = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  const { gl, invalidate } = useThree();

  useEffect(() => {
    const element = gl.domElement;

    const handleMove = (event: PointerEvent): void => {
      pointer.current.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.y = (event.clientY / window.innerHeight - 0.5) * 2;
      invalidate();
    };

    element.addEventListener("pointermove", handleMove);

    return () => {
      element.removeEventListener("pointermove", handleMove);
    };
  }, [gl, invalidate]);

  useFrame((state, delta) => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    const damping = 1 - Math.pow(0.001, Math.min(delta, 0.1));

    group.rotation.y = MathUtils.lerp(group.rotation.y, pointer.current.x * 0.22, damping);
    group.rotation.x = MathUtils.lerp(group.rotation.x, -pointer.current.y * 0.16, damping);

    if (texture) {
      texture.center.set(0.5, 0.5);
    }

    if (playing) {
      group.rotation.z += delta * 0.6;
    }
  });

  const arc = Math.max(0.001, Math.min(1, progress));

  return (
    <group>
      <group position={[0, 1.55, 1.2]} ref={groupRef}>
        <mesh>
          <cylinderGeometry args={[1.0, 1.0, 0.03, 64]} />
          <meshStandardMaterial color="#0d1017" metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.86, 64]} />
          {texture ? (
            <meshStandardMaterial map={texture} roughness={0.4} metalness={0.2} toneMapped={false} />
          ) : (
            <meshStandardMaterial color="#2a2f3d" roughness={0.5} metalness={0.2} />
          )}
        </mesh>
        {/* 进度环：非文字表达，绕盘一圈 */}
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.98, 1.01, 96, 1, 0, Math.PI * 2]} />
          <meshBasicMaterial color="#2b3040" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.98, 1.01, 96, 1, Math.PI / 2 - arc * Math.PI * 2, arc * Math.PI * 2]} />
          <meshBasicMaterial color="#ff7aa8" toneMapped={false} />
        </mesh>
      </group>

      {/* 控制：只有图标，不写字；点击区域在 DOM 层由 SceneStage 提供 */}
      <group visible={false}>
        <mesh onClick={onPrev} position={[-0.9, 0.55, 1.6]}>
          <boxGeometry args={[0.2, 0.2, 0.02]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh onClick={onToggle} position={[0, 0.55, 1.6]}>
          <boxGeometry args={[0.2, 0.2, 0.02]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh onClick={onNext} position={[0.9, 0.55, 1.6]}>
          <boxGeometry args={[0.2, 0.2, 0.02]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
    </group>
  );
};

/* ---------- 组装 ---------- */

export interface GalleryExperienceProps {
  readonly currentTrackId: string | null;
  readonly favoriteGroupIds: readonly string[];
  readonly groups: readonly GalleryGroup[];
  readonly onPlayTrack: (track: Track) => void;
  readonly playing: boolean;
  readonly positionSeconds: number;
  readonly durationSeconds: number;
  readonly onNext: () => void;
  readonly onPrev: () => void;
  readonly onToggle: () => void;
  readonly tracks: readonly Track[];
}

export const GalleryExperience = ({
  currentTrackId,
  favoriteGroupIds,
  groups,
  onNext,
  onPlayTrack,
  onPrev,
  onToggle,
  playing,
  positionSeconds,
  durationSeconds,
  tracks
}: GalleryExperienceProps) => {
  const [stage, setStage] = useState<Stage>("gallery");
  const [expandedGroup, setExpandedGroup] = useState<GalleryGroup | null>(null);
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [detailGroup, setDetailGroup] = useState<GalleryGroup | null>(null);
  const scrollRef = useRef(0);
  const currentTrack = tracks.find((track) => track.id === currentTrackId) ?? null;
  const currentGroupId = useMemo(() => {
    const group = groups.find((candidate) => currentTrackId !== null && candidate.trackIds.includes(currentTrackId));

    return group?.id ?? null;
  }, [currentTrackId, groups]);

  const progress = durationSeconds > 0 ? positionSeconds / durationSeconds : 0;

  useEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("detail") === "1" && groups.length > 1) {
      setDetailGroup(groups[1] ?? null);
    }
  }, [groups]);
  const focusGroup = groups.find((group) => group.id === currentGroupId) ?? groups[0] ?? null;
  const focusIndex = focusGroup ? groups.findIndex((group) => group.id === focusGroup.id) + 1 : 0;

  return (
    <>
      <Canvas
        camera={{ fov: 30, position: [CAMERA_POSITION[0], CAMERA_POSITION[1], CAMERA_POSITION[2]] }}
        dpr={[1, 2]}
        frameloop="always"
        gl={{ antialias: true, powerPreference: "high-performance", toneMappingExposure: 0.95 }}
        shadows
        onCreated={({ camera }) => {
          camera.lookAt(LOOK_AT[0], LOOK_AT[1], LOOK_AT[2]);
        }}
      >
        <color args={["#080b12"]} attach="background" />
        <fog args={["#080b12", 6, 16]} attach="fog" />
        <ProceduralEnvironment />
        <FrameProbe />
        <LightShafts />
        <DappledLight />
        <hemisphereLight args={["#cfe0ff", "#2a2118", 0.12]} />
        <ambientLight intensity={0.12} />
        <directionalLight
          castShadow
          color="#fff0dc"
          intensity={2.4}
          position={[2.8, 3.6, 3.4]}
          shadow-bias={-0.0003}
          shadow-camera-bottom={-1.6}
          shadow-camera-far={14}
          shadow-camera-left={-6}
          shadow-camera-near={1}
          shadow-camera-right={6}
          shadow-camera-top={4}
          shadow-mapSize-height={2048}
          shadow-mapSize-width={2048}
          shadow-normalBias={0.018}
        />
        <directionalLight color="#9aa6b8" intensity={0.35} position={[-3, 2, 2]} />

  
      {!detailGroup && stage === "gallery" ? (
          <Carousel
            currentGroupId={currentGroupId}
            favoriteGroupIds={favoriteGroupIds}
            groups={groups}
            onHover={setHoverLabel}
            scrollRef={scrollRef}
            onOpen={(group) => {
              setDetailGroup(group);
              setHoverLabel(null);
            }}
          />
        ) : null}

        {detailGroup ? (
          <BackWall />
        ) : null}
        {detailGroup ? (
          <CaseDetail
            coverPath={detailGroup.coverPath}
            onPlay={() => {
              const firstTrack = tracks.find((track) => track.id === detailGroup.trackIds[0]);

              if (firstTrack) {
                onPlayTrack(firstTrack);
              }
            }}
            tint={tintOf(detailGroup.id)}
          />
        ) : null}

        {!detailGroup && stage === "expanded" && expandedGroup ? (
          <Fan
            group={expandedGroup}
            onSelect={(track) => {
              onPlayTrack(track);
              setStage("player");
            }}
            tracks={tracks}
          />
        ) : null}

        {stage === "player" ? (
          <PlayerStage
            onNext={onNext}
            onPrev={onPrev}
            onToggle={onToggle}
            playing={playing}
            progress={progress}
            track={currentTrack}
          />
        ) : null}
      </Canvas>

      {detailGroup ? (
        <button
          aria-label="返回展厅"
          className="gallery-detail__back"
          onClick={() => {
            setDetailGroup(null);
          }}
          type="button"
        >
          ←
        </button>
      ) : null}
      <div className="gallery-meta">
        <span className="gallery-meta__rule" />
        <div>
          <p className="gallery-meta__title">MUSIC COLLECTION</p>
          <p className="gallery-meta__sub">DISCOVER A WORLD OF SOUND</p>
        </div>
      </div>

      <div className="gallery-meta__right">
        <p>EDITION 02 · 2026</p>
        <p>CD · ALBUM · MUSIC</p>
      </div>

      {stage === "gallery" ? (
        <>
          <div className="gallery-caption">
            <p className="gallery-caption__name">{focusGroup?.title ?? "CD Collection"}</p>
            <p className="gallery-caption__hint">
              {hoverLabel ?? (focusGroup ? `${focusGroup.artist} · 共 ${groups.length} 张专辑` : "曲库为空 · 右下角设置里可导入音乐")}
            </p>
          </div>

          <div className="gallery-open">
            <button
              aria-label="上一张"
              className="gallery-open__arrow"
              onClick={() => {
                scrollRef.current += 1;
              }}
              type="button"
            >
              ‹
            </button>
            <button
              aria-label="下一张"
              className="gallery-open__arrow"
              onClick={() => {
                scrollRef.current -= 1;
              }}
              type="button"
            >
              ›
            </button>
          </div>

          <div className="gallery-dashes" aria-hidden="true">
            {Array.from({ length: Math.min(groups.length, 4) }, (_unused, index) => (
              <span
                className={`gallery-dashes__item${index === Math.min(focusIndex - 1, 3) ? " is-active" : ""}`}
                key={`dash-${index}`}
              />
            ))}
          </div>
        </>
      ) : null}

      {stage === "expanded" ? (
        <button
          className="gallery-backdrop"
          onClick={() => {
            setExpandedGroup(null);
            setStage("gallery");
          }}
          type="button"
        >
          <span className="sr-only">返回展开前</span>
        </button>
      ) : null}

      {stage === "player" ? (
        <div className="gallery-controls">
          <button aria-label="上一首" className="gallery-control" onClick={onPrev} type="button">
            ◀
          </button>
          <button aria-label={playing ? "暂停" : "播放"} className="gallery-control is-primary" onClick={onToggle} type="button">
            {playing ? "❙❙" : "▶"}
          </button>
          <button aria-label="下一首" className="gallery-control" onClick={onNext} type="button">
            ▶
          </button>
          <button
            aria-label="返回展厅"
            className="gallery-control is-quiet"
            onClick={() => {
              setStage("gallery");
            }}
            type="button"
          >
            ✕
          </button>
        </div>
      ) : null}
    </>
  );
};
