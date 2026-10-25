import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box3, Color, Group, MathUtils, Mesh, MeshStandardMaterial, PMREMGenerator, RepeatWrapping, SRGBColorSpace, Texture, TextureLoader, Vector3 } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Track } from "@arlhifi/shared";
import type { GalleryGroup } from "../lib/album-groups";
import { getSeedHue } from "../lib/seed";
import { useCoverTexture } from "./cover-textures";

/** 程序化环境贴图：透明/金属材质需要可反射的周围环境，否则会是死黑。 */
const ProceduralEnvironment = () => {
  const { gl, scene } = useThree();

  useEffect(() => {
    const generator = new PMREMGenerator(gl);
    const environment = generator.fromScene(new RoomEnvironment(), 0.04);

    scene.environment = environment.texture;
    scene.environmentIntensity = 0.9;

    return () => {
      scene.environment = null;
      environment.dispose();
      generator.dispose();
    };
  }, [gl, scene]);

  return null;
};

const GAP = 0.62;
const DISC_RADIUS = 0.26;
const BASE_Y = 1.26;
const CAMERA_POSITION: readonly [number, number, number] = [0, 1.86, 4.55];
const LOOK_AT: readonly [number, number, number] = [0, 1.52, 0];

/** 编辑体色板：低饱和、成套，避免随机彩虹色。 */
const PALETTE = ["#c96f5a", "#8fa7b8", "#31506b", "#8a9a52", "#c8a06a", "#8c6b86", "#9fb0b8", "#a8563f"];

const tintOf = (id: string): string => PALETTE[getSeedHue(id) % PALETTE.length] ?? PALETTE[0] ?? "#c96f5a";
const VISIBLE = 7;

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
  const { scene } = useLoader(GLTFLoader, "/models/cd-case.glb");

  const prepared = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((child) => {
      const mesh = child as Mesh;

      if (!mesh.isMesh) {
        return;
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (CD_PRINT_NODES.has(mesh.name) || DISC_NODES.has(mesh.name)) {
        mesh.visible = false;
        return;
      }

      if (mesh.name === COVER_NODE) {
        mesh.material = new MeshStandardMaterial({
          color: coverTexture ? "#ffffff" : tint,
          map: coverTexture,
          metalness: 0.02,
          roughness: 0.7
        });
      }
    });

    const box = new Box3().setFromObject(clone);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    const fit = 0.52 / Math.max(size.y, 0.0001);

    const wrapper = new Group();
    clone.position.set(-center.x, -center.y, -center.z);
    wrapper.rotation.y = -Math.PI / 2;
    wrapper.scale.setScalar(fit);
    wrapper.add(clone);

    return wrapper;
  }, [coverTexture, scene, tint]);

  return <primitive object={prepared} />;
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
        {/* 封面：贴在最前面，等价于"内页贴着前盖内侧"，确保可见 */}
        <mesh position={[0.022, 0, 0.029]} scale={scale}>
          <planeGeometry args={[0.46, 0.46]} />
          {texture ? (
            <meshStandardMaterial map={texture} metalness={0.02} roughness={0.7} toneMapped={false} />
          ) : (
            <meshStandardMaterial color={tint} metalness={0.02} roughness={0.72} />
          )}
        </mesh>

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
  const textures = useLoader(TextureLoader, [
    "/textures/wall-color.jpg",
    "/textures/wall-normal.jpg",
    "/textures/wall-roughness.jpg"
  ]);
  const [map, normalMap, roughnessMap] = textures;

  useEffect(() => {
    for (const texture of textures) {
      if (!texture) {
        continue;
      }

      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(12, 1);
      texture.needsUpdate = true;
    }

    if (map) {
      map.colorSpace = SRGBColorSpace;
    }
  }, [map, textures]);

  return (
    <meshStandardMaterial
      color="#cdc6ba"
      map={map ?? null}
      metalness={0.02}
      normalMap={normalMap ?? null}
      roughness={0.92}
      roughnessMap={roughnessMap ?? null}
    />
  );
};

/** 柜体立面（Wood008 竖纹，CC0）。 */
const CabinetSurface = () => {
  const textures = useLoader(TextureLoader, [
    "/textures/wood008-color.jpg",
    "/textures/wood008-normal.jpg",
    "/textures/wood008-roughness.jpg"
  ]);
  const [map, normalMap, roughnessMap] = textures;

  useEffect(() => {
    for (const texture of textures) {
      if (!texture) {
        continue;
      }

      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(4, 0.12);
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
      normalMap={normalMap ?? null}
      roughness={0.7}
      roughnessMap={roughnessMap ?? null}
    />
  );
};

/** 台面：真实木纹贴图（ambientCG Wood066，CC0）。 */
const DeskSurface = () => {
  const textures = useLoader(TextureLoader, [
    "/textures/wood066-color.jpg",
    "/textures/wood066-normal.jpg",
    "/textures/wood066-roughness.jpg"
  ]);
  const [map, normalMap, roughnessMap] = textures;

  useEffect(() => {
    for (const texture of textures) {
      if (!texture) {
        continue;
      }

      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(8, 2);
      texture.needsUpdate = true;
    }

    if (map) {
      map.colorSpace = SRGBColorSpace;
    }
  }, [map, textures]);

  return (
    <mesh position={[0, BASE_Y - 0.32, 0.05]} receiveShadow>
      <boxGeometry args={[40, 0.12, 0.62]} />
      <meshStandardMaterial
        map={map ?? null}
        metalness={0.04}
        normalMap={normalMap ?? null}
        roughness={0.72}
        roughnessMap={roughnessMap ?? null}
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
    <mesh position={[0, BASE_Y - 0.95, 0.2]}>
      <boxGeometry args={[40, 1.2, 0.08]} />
      <CabinetSurface />
    </mesh>
    {/* 背墙 */}
    <mesh position={[0, BASE_Y + 0.55, -0.34]}>
      <boxGeometry args={[40, 3.4, 0.08]} />
      <WallSurface />
    </mesh>
  </group>
);

/* ---------- 横向单排 + 无限循环 ---------- */

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
      pointer.target -= deltaX * 0.006;
      pointer.velocity = -deltaX * 0.006;
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
      pointer.target -= Math.sign(event.deltaY || event.deltaX) * GAP;
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

    if (Math.abs(pointer.offset - pointer.target) > 0.0005 || Math.abs(pointer.velocity) > 0.0005) {
      invalidate();
    }
  });

  return (
    <group>
      <Shelf />
      {groups.slice(0, 400).map((group, index) => {
        // 相对位移 + 取模：滑出右边界的那张从左侧回来，形成无缝循环。
        let x = index * GAP + state.current.offset;

        if (loopable) {
          const half = length / 2;
          x = (((x + half) % length) + length) % length - half;
        }

        if (Math.abs(x) > GAP * (VISIBLE + 1)) {
          return null;
        }

        return (
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
            position={[x, BASE_Y, 0]}
            rotationY={0}
            scale={1}
          />
        );
      })}
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
  const scrollRef = useRef(0);
  const currentTrack = tracks.find((track) => track.id === currentTrackId) ?? null;
  const currentGroupId = useMemo(() => {
    const group = groups.find((candidate) => currentTrackId !== null && candidate.trackIds.includes(currentTrackId));

    return group?.id ?? null;
  }, [currentTrackId, groups]);

  const progress = durationSeconds > 0 ? positionSeconds / durationSeconds : 0;
  const focusGroup = groups.find((group) => group.id === currentGroupId) ?? groups[0] ?? null;
  const focusIndex = focusGroup ? groups.findIndex((group) => group.id === focusGroup.id) + 1 : 0;

  return (
    <>
      <Canvas
        camera={{ fov: 30, position: [CAMERA_POSITION[0], CAMERA_POSITION[1], CAMERA_POSITION[2]] }}
        dpr={[1, 1.25]}
        frameloop="demand"
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ camera }) => {
          camera.lookAt(LOOK_AT[0], LOOK_AT[1], LOOK_AT[2]);
        }}
      >
        <color args={["#080b12"]} attach="background" />
        <fog args={["#080b12", 6, 16]} attach="fog" />
        <ProceduralEnvironment />
        <ambientLight intensity={0.6} />
        <directionalLight
          castShadow
          color="#fff0dc"
          intensity={1.15}
          position={[3.6, 4.4, 2.4]}
          shadow-mapSize-height={1024}
          shadow-mapSize-width={1024}
        />
        <directionalLight color="#9aa6b8" intensity={0.35} position={[-3, 2, 2]} />

        {stage === "gallery" ? (
          <Carousel
            currentGroupId={currentGroupId}
            favoriteGroupIds={favoriteGroupIds}
            groups={groups}
            onHover={setHoverLabel}
            scrollRef={scrollRef}
            onOpen={(group) => {
              setExpandedGroup(group);
              setStage("expanded");
              setHoverLabel(null);
            }}
          />
        ) : null}

        {stage === "expanded" && expandedGroup ? (
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
              {hoverLabel ?? (focusGroup ? `${focusGroup.artist} · 共 ${groups.length} 张专辑` : "用光盘，收藏每一段值得回味的声音。")}
            </p>
          </div>

          <div className="gallery-open">
            <button
              aria-label="上一张"
              className="gallery-open__arrow"
              onClick={() => {
                scrollRef.current -= 1;
              }}
              type="button"
            >
              ‹
            </button>
            <button
              className="gallery-open__pill"
              onClick={() => {
                if (focusGroup) {
                  setExpandedGroup(focusGroup);
                  setStage("expanded");
                  setHoverLabel(null);
                }
              }}
              type="button"
            >
              OPEN
            </button>
            <button
              aria-label="下一张"
              className="gallery-open__arrow"
              onClick={() => {
                scrollRef.current += 1;
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
