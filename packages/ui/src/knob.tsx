import { useRef, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import { cn } from "./lib/cn";

const MIN_VALUE = 0;
const MAX_VALUE = 100;
const STEP = 2;
const LARGE_STEP = 10;
const RADIUS = 18;
const ARC_SPAN_DEG = 270;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_LENGTH = CIRCUMFERENCE * (ARC_SPAN_DEG / 360);

const clampValue = (value: number): number => Math.max(MIN_VALUE, Math.min(MAX_VALUE, Math.round(value)));

export interface KnobProps {
  readonly className?: string;
  readonly label: string;
  readonly onChange: (value: number) => void;
  readonly value: number;
}

export const Knob = ({ className, label, onChange, value }: KnobProps) => {
  const dragRef = useRef<{ startValue: number; startY: number } | null>(null);
  const safeValue = clampValue(value);
  const progress = (safeValue - MIN_VALUE) / (MAX_VALUE - MIN_VALUE);
  const rotation = -ARC_SPAN_DEG / 2 + ARC_SPAN_DEG * progress;

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startValue: safeValue, startY: event.clientY };
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>): void => {
    const drag = dragRef.current;

    if (!drag) {
      return;
    }

    onChange(clampValue(drag.startValue + (drag.startY - event.clientY)));
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>): void => {
    dragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: WheelEvent<HTMLButtonElement>): void => {
    onChange(clampValue(safeValue + (event.deltaY < 0 ? STEP : -STEP)));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const key = event.key;
    const stepBy = (delta: number): void => {
      event.preventDefault();
      onChange(clampValue(safeValue + delta));
    };

    switch (key) {
      case "ArrowUp":
      case "ArrowRight":
        stepBy(STEP);
        break;
      case "ArrowDown":
      case "ArrowLeft":
        stepBy(-STEP);
        break;
      case "PageUp":
        stepBy(LARGE_STEP);
        break;
      case "PageDown":
        stepBy(-LARGE_STEP);
        break;
      case "Home":
        event.preventDefault();
        onChange(MIN_VALUE);
        break;
      case "End":
        event.preventDefault();
        onChange(MAX_VALUE);
        break;
      default:
        break;
    }
  };

  return (
    <button
      aria-label={label}
      aria-valuemax={MAX_VALUE}
      aria-valuemin={MIN_VALUE}
      aria-valuenow={safeValue}
      aria-valuetext={`${safeValue}%`}
      className={cn("al-knob", className)}
      onKeyDown={handleKeyDown}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      role="slider"
      title={`${label} ${safeValue}%`}
      type="button"
    >
      <svg aria-hidden="true" className="al-knob__arc" viewBox="0 0 44 44">
        <circle
          className="al-knob__arc-track"
          cx="22"
          cy="22"
          r={RADIUS}
          strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
          transform="rotate(135 22 22)"
        />
        <circle
          className="al-knob__arc-value"
          cx="22"
          cy="22"
          r={RADIUS}
          strokeDasharray={`${ARC_LENGTH * progress} ${CIRCUMFERENCE}`}
          transform="rotate(135 22 22)"
        />
      </svg>
      <span aria-hidden="true" className="al-knob__dial" />
      <span aria-hidden="true" className="al-knob__pointer" style={{ transform: `rotate(${rotation}deg)` }} />
    </button>
  );
};
