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
 * 把叶子照片处理成"只剩影子"的遮罩贴图。
 * three 的 alphaMap 只读取绿色通道，所以把不透明度写进 G，RGB 保持黑色。
 */
export const createLeafShadowAlpha = async (url: string, blurPx = 9): Promise<Texture> => {
  const image = await loadImage(url);
  const size = 1024;
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
    const shade = Math.max(0, Math.min(1, 1 - luminance * 1.25));
    const alpha = Math.round(shade * 255);

    data[index] = 0;
    data[index + 1] = alpha;
    data[index + 2] = 0;
    data[index + 3] = 255;
  }

  context.putImageData(frame, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
};