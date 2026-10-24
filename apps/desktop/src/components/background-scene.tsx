import { useEffect, useRef, type CSSProperties } from "react";
import { useEffectiveMotionTier } from "../hooks/use-app-preferences";
import { useWallpaperStore } from "../store/wallpaper-store";

interface Star {
  readonly cx: number;
  readonly cy: number;
  readonly key: string;
  readonly opacity: number;
  readonly r: number;
}

interface SceneStyle extends CSSProperties {
  readonly "--parallax-x": string;
  readonly "--parallax-y": string;
  readonly "--veil-bottom": string;
  readonly "--veil-top": string;
  readonly "--wallpaper-blur": string;
}

const PARALLAX_RANGE = 6;

const stars: readonly Star[] = Array.from({ length: 52 }, (_unused, index) => {
  const x = ((index * 173.7) % 100) / 100;
  const y = ((index * 71.3) % 100) / 100;

  return {
    key: `star-${index}`,
    cx: x * 1440,
    cy: y * 470,
    r: index % 9 === 0 ? 1.9 : 1.1,
    opacity: 0.24 + ((index * 29) % 55) / 100
  };
});

const buildings: readonly { readonly height: number; readonly width: number; readonly x: number }[] = [
  { x: 810, width: 62, height: 96 },
  { x: 878, width: 44, height: 64 },
  { x: 930, width: 78, height: 132 },
  { x: 1014, width: 52, height: 84 },
  { x: 1072, width: 96, height: 168 },
  { x: 1174, width: 58, height: 110 },
  { x: 1240, width: 74, height: 74 },
  { x: 1320, width: 46, height: 128 }
];

/** 内置夜景壁纸：无版权依赖，颜色随主题切换，丰富动效档支持指针视差。 */
export const BackgroundScene = () => {
  const url = useWallpaperStore((state) => state.url);
  const dim = useWallpaperStore((state) => state.dim);
  const blur = useWallpaperStore((state) => state.blur);
  const motionTier = useEffectiveMotionTier();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || motionTier !== "rich") {
      return;
    }

    let frame = 0;

    const handlePointerMove = (event: PointerEvent): void => {
      if (event.pointerType !== "mouse") {
        return;
      }

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;

        container.style.setProperty("--parallax-x", `${(-x * PARALLAX_RANGE).toFixed(2)}px`);
        container.style.setProperty("--parallax-y", `${(-y * PARALLAX_RANGE * 0.6).toFixed(2)}px`);
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [motionTier]);

  const style: SceneStyle = {
    "--parallax-x": "0px",
    "--parallax-y": "0px",
    "--veil-top": `${(0.1 + dim * 0.005).toFixed(3)}`,
    "--veil-bottom": `${(0.35 + dim * 0.006).toFixed(3)}`,
    "--wallpaper-blur": `${blur}px`
  };

  return (
    <div aria-hidden="true" className="background" ref={containerRef} style={style}>
      {url ? (
        <div className="background__wallpaper" style={{ backgroundImage: `url("${url}")` }} />
      ) : (
        <svg className="background__art" preserveAspectRatio="xMidYMax slice" viewBox="0 0 1440 900">
          <defs>
            <radialGradient id="moon-glow" cx="50%" cy="50%" r="50%">
              <stop className="scene-moon-stop" offset="0%" stopOpacity="0.42" />
              <stop className="scene-moon-stop" offset="100%" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="sky-fade" x1="0" x2="0" y1="0" y2="1">
              <stop className="scene-sky-stop" offset="0%" stopOpacity="0.85" />
              <stop className="scene-sky-stop" offset="60%" stopOpacity="0.34" />
              <stop className="scene-sky-stop" offset="100%" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="town-fade" x1="0" x2="0" y1="0" y2="1">
              <stop className="scene-branch-stop" offset="0%" stopOpacity="0.14" />
              <stop className="scene-branch-stop" offset="100%" stopOpacity="0" />
            </linearGradient>
          </defs>

          <rect fill="url(#sky-fade)" height="900" width="1440" />
          <ellipse className="scene-glow" cx="1270" cy="130" fill="url(#moon-glow)" rx="190" ry="190" />
          <circle className="scene-moon" cx="1270" cy="130" r="38" />
          <circle className="scene-moon-halo" cx="1270" cy="130" r="52" />

          {stars.map((star) => (
            <circle className="scene-star" cx={star.cx} cy={star.cy} key={star.key} opacity={star.opacity} r={star.r} />
          ))}

          <g opacity="0.5">
            {buildings.map((building) => (
              <rect
                className="scene-building"
                height={building.height}
                key={`building-${building.x}`}
                width={building.width}
                x={building.x}
                y={640 - building.height}
              />
            ))}
          </g>

          {buildings.map((building) =>
            [0, 1, 2].map((row) => (
              <rect
                className="scene-window"
                height="2"
                key={`window-${building.x}-${row}`}
                opacity={0.16 + row * 0.07}
                width={building.width * 0.32}
                x={building.x + building.width * 0.18}
                y={640 - building.height + 18 + row * 22}
              />
            ))
          )}

          <rect height="150" width="1440" y="520" fill="url(#town-fade)" />
          <path className="scene-ground" d="M0 700 Q 360 640 720 690 T 1440 660 L1440 900 L0 900 Z" opacity="0.92" />

          <g className="scene-branch" fill="none" opacity="0.26" strokeWidth="2">
            <path d="M-20 780 C 120 720 240 754 330 690 C 380 656 402 604 380 566" />
            <path d="M120 762 C 180 742 214 706 206 664" />
          </g>
          <g className="scene-petal" opacity="0.42">
            <circle cx="382" cy="560" r="4" />
            <circle cx="206" cy="658" r="3.4" />
            <circle cx="330" cy="690" r="3" />
            <circle cx="146" cy="716" r="2.6" />
            <circle cx="248" cy="742" r="2.4" />
          </g>
        </svg>
      )}

      <div className="background__veil" />
      <div className="background__grain" />
    </div>
  );
};
