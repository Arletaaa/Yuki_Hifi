import { useState } from "react";
import { usePlayerStore } from "../store/player-store";
import { useSettingsStore } from "../store/settings-store";

interface Swatch {
  readonly base: string;
  readonly id: string;
  readonly image?: string;
  readonly label: string;
}

const TABLE_SWATCHES: readonly Swatch[] = [
  { id: "wood-h", label: "横向木纹", image: "/textures/wood066-color.jpg", base: "#6b4f34" },
  { id: "wood-v", label: "竖向木纹", image: "/textures/wood008-color.jpg", base: "#4a3324" },
  { id: "walnut", label: "深胡桃", base: "#3b2a1d" },
  { id: "oak", label: "浅橡木", base: "#b08d63" }
];

const WALL_SWATCHES: readonly Swatch[] = [
  { id: "fabric009", label: "织物 009", image: "/textures/wall-color.jpg", base: "#5d2b2b" },
  { id: "fabric028", label: "织物 028", base: "#8a8378" },
  { id: "plain", label: "素色", base: "#6f6860" },
  { id: "gradient", label: "渐变", base: "#2b2f3a" }
];

const SILHOUETTE_SWATCHES: readonly Swatch[] = [
  { id: "none", label: "无", base: "transparent" },
  { id: "leaf", label: "树叶", base: "#1b1f18" },
  { id: "blind", label: "百叶窗", base: "#242830" },
  { id: "dots", label: "圆孔光斑", base: "#2a2a2a" }
];

const LIGHT_SWATCHES: readonly Swatch[] = [
  { id: "morning", label: "晨光斜射", base: "#f0d7b4" },
  { id: "night", label: "夜色冷光", base: "#7fa6c9" },
  { id: "spot", label: "顶灯聚光", base: "#fff4e2" }
];

interface SwatchRowProps {
  readonly items: readonly Swatch[];
  readonly onChange: (id: string) => void;
  readonly title: string;
  readonly value: string;
}

const SwatchRow = ({ items, onChange, title, value }: SwatchRowProps) => (
  <section className="preset-row">
    <p className="preset-row__title">{title}</p>
    <div className="preset-row__items">
      {items.map((item) => (
        <button
          className={`preset-swatch${item.id === value ? " is-active" : ""}`}
          key={item.id}
          onClick={() => {
            onChange(item.id);
          }}
          type="button"
        >
          <span
            className="preset-swatch__ball"
            style={
              item.image
                ? { backgroundImage: `url(${item.image})`, backgroundColor: item.base }
                : { backgroundColor: item.base }
            }
          />
          <span className="preset-swatch__label">{item.label}</span>
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
  const [wall, setWall] = useState("fabric009");
  const [silhouette, setSilhouette] = useState("none");
  const [light, setLight] = useState("morning");

  return (
    <div className="settings-overlay__inner">
      <header className="settings-overlay__header">
        <p className="settings-overlay__title">场景预设</p>
        <button aria-label="关闭设置" className="settings-overlay__close" onClick={onClose} type="button">
          ✕
        </button>
      </header>

      <SwatchRow items={TABLE_SWATCHES} onChange={setTable} title="台面" value={table} />
      <SwatchRow items={WALL_SWATCHES} onChange={setWall} title="墙面" value={wall} />
      <SwatchRow items={SILHOUETTE_SWATCHES} onChange={setSilhouette} title="剪影" value={silhouette} />
      <SwatchRow items={LIGHT_SWATCHES} onChange={setLight} title="光效" value={light} />

      <section className="preset-row">
        <p className="preset-row__title">音量</p>
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
      </section>

      <footer className="settings-overlay__about">
        <p>Arlt HiFi Player · v0.1.0</p>
        <p>CD Jewel Case by 蓝人组合 · CC-BY 4.0 · Sketchfab</p>
        <p>Wood066 / Wood008 / Fabric009 来自 ambientCG · CC0</p>
      </footer>
    </div>
  );
};