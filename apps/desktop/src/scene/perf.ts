import { useEffect, useState } from "react";

export interface SceneStats {
  calls: number;
  textures: number;
  triangles: number;
}

/** 渲染器统计，由场景内的探针每帧写入。 */
export const sceneStats: SceneStats = {
  calls: 0,
  textures: 0,
  triangles: 0
};

let renderedFrames = 0;

export const countRenderedFrame = (): void => {
  renderedFrames += 1;
};

export const consumeRenderedFrames = (): number => {
  const frames = renderedFrames;
  renderedFrames = 0;

  return frames;
};

export interface FrameRateSample {
  readonly fps: number;
  readonly rendersPerSecond: number;
}

/**
 * 独立于 three 的帧率采样：rAF 间隔反映浏览器实际帧率，
 * 渲染帧数反映场景是否真的在画（静止时应归零）。
 */
export const useFrameRateSample = (intervalMs = 500): FrameRateSample => {
  const [sample, setSample] = useState<FrameRateSample>({ fps: 0, rendersPerSecond: 0 });

  useEffect(() => {
    let frameId = 0;
    let frames = 0;
    let windowStart = performance.now();

    const tick = (now: number): void => {
      frames += 1;
      const elapsed = now - windowStart;

      if (elapsed >= intervalMs) {
        const renders = consumeRenderedFrames();
        setSample({
          fps: Math.round((frames * 1000) / elapsed),
          rendersPerSecond: Math.round((renders * 1000) / elapsed)
        });
        frames = 0;
        windowStart = now;
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [intervalMs]);

  return sample;
};
