/**
 * CD 长廊的空间布局：曲库索引 → 架位坐标。
 * 纯函数，不依赖 three，可单测（见 layout.test.ts）。
 */

export const SLOTS_PER_TIER = 4;
export const TIER_COUNT = 3;
export const SIDES_PER_BAY = 2;

/** 每个展示段（Bay）容纳的 CD 数量：3 层 × 4 列 × 2 侧 = 24 */
export const SLOTS_PER_BAY = SLOTS_PER_TIER * TIER_COUNT * SIDES_PER_BAY;

export const BAY_DEPTH = 2.0;
export const COLUMN_SPACING = 0.5;
export const RACK_X = 1.15;
export const EYE_HEIGHT = 1.6;

/** 单张 CD 外壳尺寸（世界单位，约等于 0.46m 的展示放大板） */
export const SLEEVE_SIZE = 0.46;
export const DISC_RADIUS = 0.21;

const TIER_Y: readonly number[] = [0.98, 1.48, 1.98];
const SLOT_FACING = Math.PI / 2 - 0.38;

export type GallerySide = "left" | "right";

export interface GalleryAnchor {
  readonly bay: number;
  readonly column: number;
  readonly side: GallerySide;
  readonly tier: number;
}

export interface SlotTransform {
  readonly position: readonly [number, number, number];
  readonly rotationY: number;
}

export const getBayCount = (trackCount: number): number =>
  trackCount <= 0 ? 1 : Math.ceil(trackCount / SLOTS_PER_BAY);

export const getGalleryAnchor = (index: number): GalleryAnchor => {
  const safeIndex = Math.max(0, Math.floor(index));
  const bay = Math.floor(safeIndex / SLOTS_PER_BAY);
  const slot = safeIndex % SLOTS_PER_BAY;
  const halfBay = SLOTS_PER_BAY / SIDES_PER_BAY;
  const side: GallerySide = slot < halfBay ? "left" : "right";
  const withinSide = slot % halfBay;

  return {
    bay,
    side,
    tier: Math.floor(withinSide / SLOTS_PER_TIER),
    column: withinSide % SLOTS_PER_TIER
  };
};

export const getSlotTransform = (index: number): SlotTransform => {
  const { bay, column, side, tier } = getGalleryAnchor(index);
  const x = side === "left" ? -RACK_X : RACK_X;
  const y = TIER_Y[tier] ?? TIER_Y[0] ?? EYE_HEIGHT;
  const z = -bay * BAY_DEPTH - (column - (SLOTS_PER_TIER - 1) / 2) * COLUMN_SPACING;

  return {
    position: [x, y, z],
    rotationY: side === "left" ? SLOT_FACING : -SLOT_FACING
  };
};
