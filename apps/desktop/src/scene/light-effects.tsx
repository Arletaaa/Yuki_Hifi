import { AdditiveBlending, CanvasTexture, Group, SRGBColorSpace, Texture } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";

const BASE_Y = 1.3;

/** 竖直方向的柔光条：中间亮、两侧透明，用作光束贴片。 */
const createShaftTexture = (): Texture => {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 512;
  const context = canvas.getContext("2d");

  if (context) {
    const across = context.createLinearGradient(0, 0, 128, 0);
    across.addColorStop(0, "rgba(255,240,214,0)");
    across.addColorStop(0.5, "rgba(255,240,214,0.95)");
    across.addColorStop(1, "rgba(255,240,214,0)");
    context.fillStyle = across;
    context.fillRect(0, 0, 128, 512);

    context.globalCompositeOperation = "destination-in";
    const down = context.createLinearGradient(0, 0, 0, 512);
    down.addColorStop(0, "rgba(255,255,255,1)");
    down.addColorStop(0.65, "rgba(255,255,255,0.45)");
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
const createCausticTexture = (): Texture => {
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

    for (let index = 0; index < 150; index += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 7 + Math.random() * 22;
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, "rgba(255,236,200,0.5)");
      gradient.addColorStop(1, "rgba(255,236,200,0)");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = 1000;
  texture.wrapT = 1000;
  texture.needsUpdate = true;

  return texture;
};

/** 丁达尔光束：几片叠加混合的软光片，缓慢漂移与呼吸。 */
export const LightShafts = () => {
  const texture = useMemo(() => createShaftTexture(), []);
  const groupRef = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidate();
  }, [invalidate]);

  useFrame((frame) => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    const time = frame.clock.elapsedTime;
    group.children.forEach((child, index) => {
      const phase = index * 1.7;
      child.position.x = -3.6 + index * 1.9 + Math.sin(time * 0.18 + phase) * 0.45;
      const material = (child as unknown as { material?: { opacity: number } }).material;

      if (material) {
        material.opacity = 0.2 + Math.abs(Math.sin(time * 0.25 + phase)) * 0.14;
      }
    });
  });

  return (
    <group position={[0, BASE_Y + 0.1, 0.4]} ref={groupRef}>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <mesh
          key={`shaft-${index}`}
          position={[-3.6 + index * 1.9, 0, 0]}
          rotation={[0, 0, -0.22]}
        >
          <planeGeometry args={[0.8, 4.6]} />
          <meshBasicMaterial
            blending={AdditiveBlending}
            depthWrite={false}
            map={texture}
            opacity={0.4}
            toneMapped={false}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
};

/** 墙面/台面的流动光斑：叠加混合的斑驳贴图，缓慢平移。 */
export const DappledLight = () => {
  const texture = useMemo(() => createCausticTexture(), []);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidate();
  }, [invalidate]);

  useFrame((frame) => {
    texture.offset.x = Math.sin(frame.clock.elapsedTime * 0.045) * 0.25;
    texture.offset.y = Math.cos(frame.clock.elapsedTime * 0.06) * 0.18;
  });

  return (
    <group>
      <mesh position={[0, BASE_Y + 1.0, -0.27]}>
        <planeGeometry args={[22, 4.2]} />
        <meshBasicMaterial
          blending={AdditiveBlending}
          depthWrite={false}
          map={texture}
          opacity={0.4}
          toneMapped={false}
          transparent
        />
      </mesh>
    </group>
  );
};