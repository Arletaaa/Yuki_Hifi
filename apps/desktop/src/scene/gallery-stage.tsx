import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Color, Group, MathUtils, Mesh } from "three";
import type { Track } from "@arlhifi/shared";
import type { GalleryGroup } from "../lib/album-groups";
import { getSeedHue } from "../lib/seed";
import { useCoverTexture } from "./cover-textures";

const GAP = 0.62;
const DISC_RADIUS = 0.26;
const BASE_Y = 1.15;
const CAMERA_POSITION: readonly [number, number, number] = [0, 2.5, 6.0];
const LOOK_AT: readonly [number, number, number] = [0, 1.02, 0];
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

  useFrame((state, delta) => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    const damping = 1 - Math.pow(0.0001, Math.min(delta, 0.1));
    const liftTarget = hovered ? 0.06 : 0;
    const tiltTarget = hovered ? 0.16 : 0;

    group.position.z = MathUtils.lerp(group.position.z, liftTarget, damping);
    group.rotation.y = MathUtils.lerp(group.rotation.y, tiltTarget, damping);

    if (spinning && meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * -0.35;
    }
  });

  return (
    <group position={[position[0], position[1], position[2]]} rotation={[0, rotationY, 0]}>
      <mesh
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
        <boxGeometry args={[DISC_RADIUS * 2.3, DISC_RADIUS * 2.3, 0.045]} />
        <meshStandardMaterial
          color={isFavorite ? "#4b3a20" : "#1b2029"}
          emissive={isFavorite ? new Color("#c08a34") : new Color("#000000")}
          emissiveIntensity={isFavorite ? 0.3 : 0}
          metalness={0.4}
          roughness={0.42}
        />
        <mesh position={[0, 0, 0.028]} ref={meshRef} scale={scale}>
          <circleGeometry args={[DISC_RADIUS, 48]} />
          {texture ? (
            <meshStandardMaterial map={texture} metalness={0.3} roughness={0.32} toneMapped={false} />
          ) : (
            <meshStandardMaterial color={`hsl(${getSeedHue(id)}, 62%, 56%)`} metalness={0.35} roughness={0.3} />
          )}
        </mesh>
        {isCurrent ? (
          <mesh position={[0, -DISC_RADIUS * 1.28, 0.03]}>
            <planeGeometry args={[0.34, 0.012]} />
            <meshBasicMaterial color="#ff7aa8" toneMapped={false} />
          </mesh>
        ) : null}
      </mesh>
    </group>
  );
};

/* ---------- 展架 ---------- */

const Shelf = () => (
  <group>
    <mesh position={[0, BASE_Y - 0.3, 0.02]}>
      <boxGeometry args={[40, 0.06, 0.5]} />
      <meshStandardMaterial color="#232834" metalness={0.45} roughness={0.5} />
    </mesh>
    <mesh position={[0, BASE_Y + 0.36, -0.06]}>
      <boxGeometry args={[40, 0.05, 0.2]} />
      <meshStandardMaterial color="#191d28" metalness={0.5} roughness={0.45} />
    </mesh>
    <mesh position={[0, BASE_Y - 0.02, -0.30]}>
      <boxGeometry args={[40, 1.1, 0.06]} />
      <meshStandardMaterial color="#0e1219" metalness={0.2} roughness={0.85} />
    </mesh>
  </group>
);

/* ---------- 横向单排 + 无限循环 ---------- */

const Carousel = ({
  groups,
  currentGroupId,
  favoriteGroupIds,
  onHover,
  onOpen
}: {
  readonly currentGroupId: string | null;
  readonly favoriteGroupIds: readonly string[];
  readonly groups: readonly GalleryGroup[];
  readonly onHover: (label: string | null) => void;
  readonly onOpen: (group: GalleryGroup) => void;
}) => {
  const { gl, invalidate } = useThree();
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
  const currentTrack = tracks.find((track) => track.id === currentTrackId) ?? null;
  const currentGroupId = useMemo(() => {
    const group = groups.find((candidate) => currentTrackId !== null && candidate.trackIds.includes(currentTrackId));

    return group?.id ?? null;
  }, [currentTrackId, groups]);

  const progress = durationSeconds > 0 ? positionSeconds / durationSeconds : 0;

  return (
    <>
      <Canvas
        camera={{ fov: 36, position: [CAMERA_POSITION[0], CAMERA_POSITION[1], CAMERA_POSITION[2]] }}
        dpr={[1, 1.25]}
        frameloop="demand"
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ camera }) => {
          camera.lookAt(LOOK_AT[0], LOOK_AT[1], LOOK_AT[2]);
        }}
      >
        <color args={["#080b12"]} attach="background" />
        <fog args={["#080b12", 6, 16]} attach="fog" />
        <ambientLight intensity={0.5} />
        <directionalLight color="#ffe9f2" intensity={1.1} position={[1.5, 3.4, 2.6]} />
        <pointLight color="#ff7aa8" decay={2} distance={6} intensity={6} position={[-1.6, 1.9, 1.4]} />
        <pointLight color="#78d8ff" decay={2} distance={6} intensity={5} position={[1.8, 1.7, 1.2]} />

        {stage === "gallery" ? (
          <Carousel
            currentGroupId={currentGroupId}
            favoriteGroupIds={favoriteGroupIds}
            groups={groups}
            onHover={setHoverLabel}
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

      {stage !== "player" ? (
        <p className="gallery-hint">{hoverLabel ?? "拖动 · 滚轮 · 点击 CD"}</p>
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
