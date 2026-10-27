export const lightPresetIds = ["morning", "night", "spot"] as const;

export type LightPresetId = (typeof lightPresetIds)[number];

export interface LightPresetOption {
  /** 材质球上显示的渐变。 */
  readonly gradient: string;
  readonly id: LightPresetId;
  readonly label: string;
  readonly description: string;
}

export const lightPresetOptions: readonly LightPresetOption[] = [
  {
    description: "暖色斜光 + 斑驳光点",
    gradient: "radial-gradient(circle at 32% 26%, #fff7e2 0%, #f2c78a 42%, #7c4f2c 100%)",
    id: "morning",
    label: "晨光"
  },
  {
    description: "冷色月光 + 稀疏光柱",
    gradient: "radial-gradient(circle at 32% 26%, #eaf4ff 0%, #8db2da 40%, #17243a 100%)",
    id: "night",
    label: "夜色"
  },
  {
    description: "顶灯追光，只照亮展台",
    gradient: "radial-gradient(circle at 50% 16%, #fffdf4 0%, #ffd79b 34%, #211409 82%)",
    id: "spot",
    label: "聚光"
  }
];

export const isLightPresetId = (value: string): value is LightPresetId =>
  lightPresetIds.includes(value as LightPresetId);

/** 旧设置里可能有未知值（例如已删除的预设），回退到晨光。 */
export const normalizeLightPreset = (value: string): LightPresetId =>
  isLightPresetId(value) ? value : "morning";
