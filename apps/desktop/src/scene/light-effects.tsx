import {
  AdditiveBlending,
  CanvasTexture,
  Group,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture
} from "three";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { LightPresetId } from "../lib/light-presets";

const BASE_Y = 1.3;

/**
 * 灯具体积：下界在台面以下，上界高于交互区画面顶（约 4.5m）。
 * 陈列画幅（0–2.4m）和交互画幅（1.7–4.5m）都落在体积内部，
 * 两个镜头看到的都是灯效中段，而不是顶端切面。
 */
const STAGE_BOTTOM = -1.5;
const STAGE_TOP = 6.5;
const STAGE_HEIGHT = STAGE_TOP - STAGE_BOTTOM;
const STAGE_CENTER = (STAGE_TOP + STAGE_BOTTOM) / 2;

type Rgb = readonly [number, number, number];

/** 竖直方向的柔光条：中间亮、两侧透明，用作光束贴片。 */
const createShaftTexture = ([red, green, blue]: Rgb): Texture => {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 512;
  const context = canvas.getContext("2d");

  if (context) {
    const across = context.createLinearGradient(0, 0, 128, 0);
    across.addColorStop(0, `rgba(${red}, ${green}, ${blue}, 0)`);
    across.addColorStop(0.5, `rgba(${red}, ${green}, ${blue}, 0.95)`);
    across.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
    context.fillStyle = across;
    context.fillRect(0, 0, 128, 512);

    context.globalCompositeOperation = "destination-in";
    // 在 8m 灯具体积里重新采样：0.19–0.49 对应原来陈列区可见的 0.2–0.715，
    // 下段观感不变；顶端继续变亮，让光源落在两个镜头画面之外。
    const down = context.createLinearGradient(0, 0, 0, 512);
    down.addColorStop(0, "rgba(255,255,255,1)");
    down.addColorStop(0.22, "rgba(255,255,255,0.9)");
    down.addColorStop(0.51, "rgba(255,255,255,0.6)");
    down.addColorStop(0.8, "rgba(255,255,255,0.22)");
    down.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = down;
    context.fillRect(0, 0, 128, 512);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
};

/** 斑驳光点（类似透过树叶/百叶的光斑）。 */
const createCausticTexture = ([red, green, blue]: Rgb, count: number): Texture => {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (context) {
    context.fillStyle = "rgba(0,0,0,1)";
    context.fillRect(0, 0, size, size);
    context.filter = "blur(9px)";
    context.globalCompositeOperation = "lighter";

    for (let index = 0; index < count; index += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 7 + Math.random() * 22;
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, 0.5)`);
      gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;

  return texture;
};

/** 聚光灯在地面/墙面上的圆形光池。 */
const createSpotTexture = (): Texture => {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255, 240, 208, 0.95)");
    gradient.addColorStop(0.42, "rgba(255, 224, 174, 0.46)");
    gradient.addColorStop(1, "rgba(255, 224, 174, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
};

/** 夜空投影灯：黑底星点 + 十字星芒 + 很淡的星云，作为聚光灯的投影贴图。 */
const createStarTexture = (): Texture => {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (context) {
    context.fillStyle = "#02030a";
    context.fillRect(0, 0, size, size);

    const nebula = context.createRadialGradient(size * 0.56, size * 0.44, size * 0.04, size * 0.56, size * 0.44, size * 0.6);
    nebula.addColorStop(0, "rgba(72, 92, 168, 0.2)");
    nebula.addColorStop(0.55, "rgba(38, 52, 110, 0.08)");
    nebula.addColorStop(1, "rgba(2, 3, 10, 0)");
    context.fillStyle = nebula;
    context.fillRect(0, 0, size, size);

    for (let index = 0; index < 900; index += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 0.3 + Math.random() * 1.1;
      const alpha = 0.22 + Math.random() * 0.62;
      const glow = context.createRadialGradient(x, y, 0, x, y, radius * 6);

      glow.addColorStop(0, `rgba(242, 248, 255, ${alpha})`);
      glow.addColorStop(0.18, `rgba(214, 231, 255, ${alpha * 0.55})`);
      glow.addColorStop(0.55, `rgba(178, 204, 255, ${alpha * 0.16})`);
      glow.addColorStop(1, "rgba(170, 198, 255, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(x, y, radius * 6, 0, Math.PI * 2);
      context.fill();
    }

    context.strokeStyle = "rgba(219, 233, 255, 0.42)";
    context.lineWidth = 0.8;

    for (let index = 0; index < 36; index += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const length = 2 + Math.random() * 7;
      context.beginPath();
      context.moveTo(x - length, y);
      context.lineTo(x + length, y);
      context.moveTo(x, y - length);
      context.lineTo(x, y + length);
      context.stroke();
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;

  return texture;
};

interface ShaftConfig {
  readonly amplitude: number;
  readonly breath: number;
  readonly color: Rgb;
  readonly count: number;
  readonly opacity: number;
  readonly rotation: number;
  readonly spacing: number;
  readonly speed: number;
  readonly start: number;
  readonly width: number;
}

const SHAFT_CONFIG: Record<Exclude<LightPresetId, "spot" | "starry">, ShaftConfig> = {
  morning: {
    amplitude: 0.45,
    breath: 0.1,
    color: [255, 240, 214],
    count: 6,
    opacity: 0.34,
    rotation: -0.22,
    spacing: 1.9,
    speed: 0.18,
    start: -3.6,
    width: 0.9
  },
  night: {
    amplitude: 0.26,
    breath: 0.05,
    color: [178, 208, 255],
    count: 3,
    opacity: 0.16,
    rotation: -0.32,
    spacing: 2.8,
    speed: 0.1,
    start: -2.8,
    width: 0.46
  }
};

interface DappleConfig {
  readonly color: Rgb;
  readonly count: number;
  readonly opacity: number;
}

const DAPPLE_CONFIG: Record<Exclude<LightPresetId, "spot" | "starry">, DappleConfig> = {
  morning: { color: [255, 236, 200], count: 150, opacity: 0.55 },
  night: { color: [196, 220, 255], count: 70, opacity: 0.28 }
};

/** 丁达尔光束：几片叠加混合的软光片，缓慢漂移与呼吸。 */
const LightShafts = ({ config }: { readonly config: ShaftConfig }) => {
  const texture = useMemo(() => createShaftTexture(config.color), [config.color]);
  const groupRef = useRef<Group>(null);

  useFrame((frame) => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    const time = frame.clock.elapsedTime;

    group.children.forEach((child, index) => {
      const phase = index * 1.7;
      child.position.x = config.start + index * config.spacing + Math.sin(time * config.speed + phase) * config.amplitude;
      const material = (child as unknown as { material?: { opacity: number } }).material;

      if (material) {
        material.opacity = config.opacity + Math.abs(Math.sin(time * 0.25 + phase)) * config.breath;
      }
    });
  });

  return (
    <group position={[0, STAGE_CENTER, -0.2]} ref={groupRef}>
      {Array.from({ length: config.count }, (_unused, index) => (
        <mesh
          key={`shaft-${index}`}
          position={[config.start + index * config.spacing, 0, 0]}
          rotation={[0, 0, config.rotation]}
        >
          <planeGeometry args={[config.width, STAGE_HEIGHT]} />
          <meshBasicMaterial
            blending={AdditiveBlending}
            depthWrite={false}
            map={texture}
            opacity={config.opacity}
            toneMapped={false}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
};

/** 墙面/台面的流动光斑：叠加混合的斑驳贴图，缓慢平移。 */
const DappledLight = ({ config }: { readonly config: DappleConfig }) => {
  const texture = useMemo(() => {
    const map = createCausticTexture(config.color, config.count);
    // 保持陈列区可见段的采样不变，只把墙面向交互区上方延展。
    map.repeat.set(1, 1.763);
    map.offset.set(0, -0.337);

    return map;
  }, [config.color, config.count]);
  const baseOffset = -0.337;

  useFrame((frame) => {
    texture.offset.x = Math.sin(frame.clock.elapsedTime * 0.045) * 0.25;
    texture.offset.y = baseOffset + Math.cos(frame.clock.elapsedTime * 0.06) * 0.18;
  });

  return (
    <mesh position={[0, STAGE_CENTER, -0.27]}>
      <planeGeometry args={[22, STAGE_HEIGHT]} />
      <meshBasicMaterial
        blending={AdditiveBlending}
        depthWrite={false}
        map={texture}
        opacity={config.opacity}
        toneMapped={false}
        transparent
      />
    </mesh>
  );
};

/** 顶灯追光：一盏真实聚光灯 + 墙面/台面的光池。 */
const SpotLighting = () => {
  const texture = useMemo(() => createSpotTexture(), []);
  const target = useMemo(() => {
    const object = new Object3D();
    object.position.set(0, STAGE_CENTER + 0.3, 0.1);

    return object;
  }, []);

  return (
    <>
      <primitive object={target} />
      <spotLight
        angle={0.45}
        color="#ffe6bf"
        decay={1.4}
        distance={12}
        intensity={26}
        penumbra={0.55}
        position={[0, 6.4, 2.6]}
        target={target}
      />
      <mesh position={[0, STAGE_CENTER + 0.4, -0.285]}>
        <planeGeometry args={[2.8, 5.6]} />
        <meshBasicMaterial
          blending={AdditiveBlending}
          depthWrite={false}
          map={texture}
          opacity={0.5}
          toneMapped={false}
          transparent
        />
      </mesh>
      <mesh position={[0, BASE_Y - 0.252, 0.18]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.4, 1.0]} />
        <meshBasicMaterial
          blending={AdditiveBlending}
          depthWrite={false}
          map={texture}
          opacity={0.4}
          toneMapped={false}
          transparent
        />
      </mesh>
    </>
  );
};

/** 夜空投影灯：一盏带星图投影的聚光灯，暗环境里把星点/星芒投到墙面、盒面和台面上。 */
const StarrySky = () => {
  const map = useMemo(createStarTexture, []);
  const target = useMemo(() => {
    const object = new Object3D();
    object.position.set(0, 2.9, 0);

    return object;
  }, []);

  useFrame((frame) => {
    const time = frame.clock.elapsedTime;
    // 很慢的漂移，循环播放时看不出接缝。
    map.offset.x = Math.sin(time * 0.012) * 0.045;
    map.offset.y = Math.cos(time * 0.009) * 0.03;
  });

  return (
    <>
      <primitive object={target} />
      <spotLight
        angle={0.9}
        color="#bcd0ff"
        decay={1.1}
        distance={18}
        intensity={55}
        map={map}
        penumbra={0.9}
        position={[0, 6.8, 3.4]}
        target={target}
      />
    </>
  );
};

export const LightEffects = ({ variant }: { readonly variant: LightPresetId }) => {
  if (variant === "spot") {
    return <SpotLighting />;
  }

  if (variant === "starry") {
    return <StarrySky />;
  }

  return (
    <>
      <LightShafts config={SHAFT_CONFIG[variant]} />
      <DappledLight config={DAPPLE_CONFIG[variant]} />
    </>
  );
};

interface LightingConfig {
  readonly ambient: number;
  readonly background: string;
  readonly fill: number;
  readonly fillColor: string;
  readonly fog: string;
  readonly fogFar: number;
  readonly fogNear: number;
  readonly hemisphereGround: string;
  readonly hemisphereIntensity: number;
  readonly hemisphereSky: string;
  readonly key: number;
  readonly keyColor: string;
}

const LIGHTING: Record<LightPresetId, LightingConfig> = {
  morning: {
    ambient: 0.12,
    background: "#080b12",
    fill: 0.35,
    fillColor: "#9aa6b8",
    fog: "#080b12",
    fogFar: 16,
    fogNear: 6,
    hemisphereGround: "#2a2118",
    hemisphereIntensity: 0.12,
    hemisphereSky: "#cfe0ff",
    key: 2.4,
    keyColor: "#fff0dc"
  },
  night: {
    ambient: 0.07,
    background: "#05070f",
    fill: 0.2,
    fillColor: "#6c86b3",
    fog: "#05070f",
    fogFar: 15.5,
    fogNear: 5.5,
    hemisphereGround: "#101827",
    hemisphereIntensity: 0.08,
    hemisphereSky: "#9cc2ff",
    key: 1.15,
    keyColor: "#b9d4ff"
  },
  spot: {
    ambient: 0.04,
    background: "#020306",
    fill: 0.05,
    fillColor: "#7d8aa0",
    fog: "#020306",
    fogFar: 13,
    fogNear: 6,
    hemisphereGround: "#0b0d12",
    hemisphereIntensity: 0.03,
    hemisphereSky: "#7d94b5",
    key: 0.28,
    keyColor: "#ffe3c0"
  },
  starry: {
    ambient: 0.015,
    background: "#010207",
    fill: 0.04,
    fillColor: "#7f93c9",
    fog: "#010207",
    fogFar: 17,
    fogNear: 6,
    hemisphereGround: "#05060c",
    hemisphereIntensity: 0.02,
    hemisphereSky: "#8199d6",
    key: 0.16,
    keyColor: "#c7d6ff"
  }
};

/** 与光效预设配套的环境光/主光；让三种光效的明暗与色温明显不同。 */
export const SceneLighting = ({ variant }: { readonly variant: LightPresetId }) => {
  const config = LIGHTING[variant];

  return (
    <>
      <color args={[config.background]} attach="background" />
      <fog args={[config.fog, config.fogNear, config.fogFar]} attach="fog" />
      <hemisphereLight
        args={[config.hemisphereSky, config.hemisphereGround, config.hemisphereIntensity]}
      />
      <ambientLight intensity={config.ambient} />
      <directionalLight
        castShadow
        color={config.keyColor}
        intensity={config.key}
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
      <directionalLight color={config.fillColor} intensity={config.fill} position={[-3, 2, 2]} />
    </>
  );
};
