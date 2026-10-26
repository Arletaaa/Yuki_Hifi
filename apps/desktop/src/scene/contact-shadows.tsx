import { CanvasTexture, SRGBColorSpace, Texture } from "three";
import { useMemo } from "react";

let sharedShadowTexture: Texture | null = null;

/** 径向渐变的黑色贴图：中心实、边缘化开，贴在台面上当接触阴影。 */
const getContactShadowTexture = (): Texture => {
  if (sharedShadowTexture) {
    return sharedShadowTexture;
  }

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, size * 0.04, size / 2, size / 2, size * 0.5);
    gradient.addColorStop(0, "rgba(0,0,0,0.92)");
    gradient.addColorStop(0.5, "rgba(0,0,0,0.5)");
    gradient.addColorStop(0.8, "rgba(0,0,0,0.14)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }

  sharedShadowTexture = new CanvasTexture(canvas);
  sharedShadowTexture.colorSpace = SRGBColorSpace;

  return sharedShadowTexture;
};

export interface ContactShadowProps {
  readonly depth: number;
  readonly width: number;
  /** 相对宿主物体的高度（贴在台面上方一点点）。 */
  readonly y: number;
}

/** 贴地的软接触阴影：方向光只能照亮大形体，物体与台面的接缝靠它压住。 */
export const ContactShadow = ({ depth, width, y }: ContactShadowProps) => {
  const texture = useMemo(getContactShadowTexture, []);

  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial depthWrite={false} map={texture} opacity={0.62} toneMapped={false} transparent />
    </mesh>
  );
};
