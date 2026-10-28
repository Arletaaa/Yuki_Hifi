export const clampVolume = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

/**
 * 把音量环上的指针角度映射成 0–100。
 * 环从 startAngle 顺时针扫 sweep 度，剩下的是底部缺口；缺口内返回 null，表示忽略这次移动。
 * 缺口以前会被加上 360°，算成 >100 再夹到 100——拖到 0 附近一越过缺口就跳到 100。
 */
export const volumeFromPointerAngle = (
  degrees: number,
  startAngle = 135,
  sweep = 270
): number | null => {
  const normalized = ((degrees % 360) + 360) % 360;
  const gapStart = (((startAngle - (360 - sweep)) % 360) + 360) % 360;
  const gapEnd = ((startAngle % 360) + 360) % 360;
  const inGap =
    gapStart < gapEnd
      ? normalized > gapStart && normalized < gapEnd
      : normalized > gapStart || normalized < gapEnd;

  if (inGap) {
    return null;
  }

  const angle = normalized < startAngle ? normalized + 360 : normalized;

  return clampVolume(((angle - startAngle) / sweep) * 100);
};
