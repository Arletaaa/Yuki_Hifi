import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { clampVolume, volumeFromPointerAngle } from "../lib/volume";

const SIZE = 96;
const CENTER = SIZE / 2;
const RADIUS = 38;
/** 仪表从左上（135°）顺时针扫到右下（405°），留出底部缺口。 */
const START_ANGLE = 135;
const SWEEP = 270;

const polar = (angle: number, radius: number): { x: number; y: number } => {
  const radians = (angle * Math.PI) / 180;

  return { x: CENTER + Math.cos(radians) * radius, y: CENTER + Math.sin(radians) * radius };
};

const describeArc = (radius: number, startAngle: number, endAngle: number): string => {
  const start = polar(startAngle, radius);
  const end = polar(endAngle, radius);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
};

export interface VolumeRingProps {
  readonly onChange: (value: number) => void;
  readonly value: number;
}

/** 播放界面的音量环：拖拽 / 滚轮 / 键盘都能调，带数值读数与 ARIA。 */
export const VolumeRing = ({ onChange, value }: VolumeRingProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const safeValue = clampVolume(value);
  // 连按方向键/滚轮时，事件可能在同一帧内连发；用 ref 保证每次都基于最新值累加。
  const valueRef = useRef(safeValue);
  const endAngle = START_ANGLE + (safeValue / 100) * SWEEP;

  useEffect(() => {
    valueRef.current = safeValue;
  }, [safeValue]);

  const apply = useCallback(
    (next: number): void => {
      const clamped = clampVolume(next);
      valueRef.current = clamped;
      onChange(clamped);
    },
    [onChange]
  );

  const setFromPointer = useCallback(
    (clientX: number, clientY: number): void => {
      const root = rootRef.current;

      if (!root) {
        return;
      }

      const rect = root.getBoundingClientRect();
      const deltaX = clientX - (rect.left + rect.width / 2);
      const deltaY = clientY - (rect.top + rect.height / 2);
      const degrees = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
      const next = volumeFromPointerAngle(degrees, START_ANGLE, SWEEP);

      if (next !== null) {
        apply(next);
      }
    },
    [apply]
  );

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();
      apply(valueRef.current + (event.deltaY > 0 ? -5 : 5));
    };

    root.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      root.removeEventListener("wheel", handleWheel);
    };
  }, [apply]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = event.shiftKey ? 10 : 5;

    switch (event.key) {
      case "ArrowUp":
      case "ArrowRight":
        event.preventDefault();
        apply(valueRef.current + step);
        break;
      case "ArrowDown":
      case "ArrowLeft":
        event.preventDefault();
        apply(valueRef.current - step);
        break;
      case "Home":
        event.preventDefault();
        apply(0);
        break;
      case "End":
        event.preventDefault();
        apply(100);
        break;
      default:
        break;
    }
  };

  return (
    <div
      aria-label="音量"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={safeValue}
      aria-valuetext={`${safeValue}%`}
      className={`volume-ring${dragging ? " is-dragging" : ""}`}
      onKeyDown={handleKeyDown}
      onPointerCancel={() => {
        setDragging(false);
      }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        setFromPointer(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (dragging) {
          setFromPointer(event.clientX, event.clientY);
        }
      }}
      onPointerUp={(event) => {
        setDragging(false);

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      ref={rootRef}
      role="slider"
      tabIndex={0}
    >
      <svg aria-hidden="true" viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <path className="volume-ring__track" d={describeArc(RADIUS, START_ANGLE, START_ANGLE + SWEEP)} />
        <path className="volume-ring__value" d={describeArc(RADIUS, START_ANGLE, endAngle)} />
        <circle className="volume-ring__knob" cx={polar(endAngle, RADIUS).x} cy={polar(endAngle, RADIUS).y} r={4} />
      </svg>
      <span className="volume-ring__readout">{safeValue}</span>
      <span className="volume-ring__label">VOL</span>
    </div>
  );
};
