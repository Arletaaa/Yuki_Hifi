import { CanvasTexture, SRGBColorSpace, Texture } from "three";

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error(`无法加载贴图：${url}`));
    };
    image.src = url;
  });

/**
 * 把叶子照片转成"只留影子"的 alpha 贴图：
 * 先高斯模糊，再按亮度反相写入 alpha（暗的叶肉变不透明，亮的背景全透明）。
 */
export const createLeafShadowAlpha = async (url: string, blurPx = 7): Promise<Texture> => {
  const image = await loadImage(url);
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("2D context 不可用");
  }

  context.filter = `blur(${blurPx}px)`;
  context.drawImage(image, 0, 0, size, size);
  context.filter = "none";

  const frame = context.getImageData(0, 0, size, size);
  const data = frame.data;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const luminance = (red * 0.299 + green * 0.587 + blue * 0.114) / 255;
    const shade = Math.max(0, 1 - luminance * 1.15);
    data[index] = 0;
    data[index + 1] = 0;
    data[index + 2] = 0;
    data[index + 3] = Math.min(255, shade * 255 * 1.6);
  }

  context.putImageData(frame, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
};

/** 竖直方向的柔和阴影（用于柜台与柜体的接触过渡）。 */
export const createVerticalFade = (fromAlpha: number, toAlpha: number): Texture => {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  if (context) {
    const gradient = context.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, `rgba(0,0,0,${fromAlpha})`);
    gradient.addColorStop(1, `rgba(0,0,0,${toAlpha})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 4, 128);
  }

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
};

/** 径向柔光（台面上的光斑）。 */
export const createRadialGlow = (): Texture => {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,236,205,0.55)");
    gradient.addColorStop(0.45, "rgba(255,226,190,0.18)");
    gradient.addColorStop(1, "rgba(255,220,180,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
};
