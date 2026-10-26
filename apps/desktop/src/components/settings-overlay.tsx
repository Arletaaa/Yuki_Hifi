import { useState } from "react";
import { usePlayerStore } from "../store/player-store";

interface Swatch {
  readonly base: string;
  readonly id: string;
  readonly image?: string;
}

const TABLE_SWATCHES: readonly Swatch[] = [
  { id: "wood-h", image: "/textures/wood066-color.jpg", base: "#6b4f34" },
  { id: "wood-v", image: "/textures/wood008-color.jpg", base: "#4a3324" },
  { id: "walnut", base: "#3b2a1d" },
  { id: "oak", base: "#b08d63" }
];

/** 台底（台面下方柜体）材质。 */
const BASE_SWATCHES: readonly Swatch[] = [
  { id: "wood-v", image: "/textures/wood008-color.jpg", base: "#4a3324" },
  { id: "wood-h", image: "/textures/wood066-color.jpg", base: "#6b4f34" },
  { id: "graphite", base: "#23262b" },
  { id: "felt", base: "#1c1a19" }
];

const WALL_SWATCHES: readonly Swatch[] = [
  { id: "fabric009", image: "/textures/wall-color.jpg", base: "#5d2b2b" },
  { id: "fabric028", base: "#8a8378" },
  { id: "plain", base: "#6f6860" },
  { id: "gradient", base: "#2b2f3a" }
];

const SILHOUETTE_SWATCHES: readonly Swatch[] = [
  { id: "none", base: "transparent" },
  { id: "leaf", base: "#1b1f18" },
  { id: "blind", base: "#242830" },
  { id: "dots", base: "#2a2a2a" }
];

const LIGHT_SWATCHES: readonly Swatch[] = [
  { id: "morning", base: "#f0d7b4" },
  { id: "night", base: "#7fa6c9" },
  { id: "spot", base: "#fff4e2" }
];

interface SwatchRowProps {
  readonly items: readonly Swatch[];
  readonly onChange: (id: string) => void;
  readonly label: string;
  readonly value: string;
}

const SwatchRow = ({ items, label, onChange, value }: SwatchRowProps) => (
  <section className="preset-row">
    <p className="preset-row__label">{label}</p>
    <div className="preset-row__items">
      {items.map((item) => (
        <button
          className={`preset-ball${item.id === value ? " is-active" : ""}`}
          key={item.id}
          onClick={() => {
            onChange(item.id);
          }}
          title={label}
          type="button"
        >
          <span
            className="preset-ball__surface"
            style={
              item.image
                ? { backgroundImage: `url(${item.image})`, backgroundColor: item.base }
                : { backgroundColor: item.base }
            }
          />
        </button>
      ))}
    </div>
  </section>
);

export interface SettingsOverlayProps {
  readonly onClose: () => void;
}

/** 半透明设置浮层：场景预设 / 音量 / 关于。 */
export const SettingsOverlay = ({ onClose }: SettingsOverlayProps) => {
  const volume = usePlayerStore((state) => state.volume);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const [table, setTable] = useState("wood-h");
  const [base, setBase] = useState("wood-v");
  const [wall, setWall] = useState("fabric009");
  const [silhouette, setSilhouette] = useState("none");
  const [light, setLight] = useState("morning");

  return (
    <div className="settings-overlay__inner">
      <button aria-label="关闭设置" className="settings-overlay__close" onClick={onClose} type="button">
        ✕
      </button>

      <SwatchRow items={TABLE_SWATCHES} label="台面" onChange={setTable} value={table} />
      <SwatchRow items={BASE_SWATCHES} label="台底" onChange={setBase} value={base} />
      <SwatchRow items={WALL_SWATCHES} label="墙面" onChange={setWall} value={wall} />
      <SwatchRow items={SILHOUETTE_SWATCHES} label="剪影" onChange={setSilhouette} value={silhouette} />
      <SwatchRow items={LIGHT_SWATCHES} label="光效" onChange={setLight} value={light} />

      <input
        aria-label="音量"
        className="overlay-volume"
        max={100}
        min={0}
        onChange={(event) => {
          setVolume(Number(event.currentTarget.value));
        }}
        type="range"
        value={volume}
      />

      <p className="settings-overlay__credit">"CD Jewel Case" by 蓝人组合 · CC-BY 4.0</p>
    </div>
  );
};