export const lightPresetIds = ["morning", "night", "spot"] as const;

export type LightPresetId = (typeof lightPresetIds)[number];

export const isLightPresetId = (value: string): value is LightPresetId =>
  lightPresetIds.includes(value as LightPresetId);

/** 旧设置里可能有未知值（例如已删除的预设），回退到晨光。 */
export const normalizeLightPreset = (value: string): LightPresetId =>
  isLightPresetId(value) ? value : "morning";
