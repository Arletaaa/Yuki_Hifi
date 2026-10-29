/** 交互常量与纯函数：方便单测，也让 3D 组件只负责接线。 */

/** 盒盖最大开合角度（180°）。 */
export const LID_MAX = Math.PI;
/** 水平拖动 360px 对应完整的 180° 开合。 */
export const LID_RAD_PER_PX = Math.PI / 360;
/**
 * 盖子与光盘的共用安全角：60°。
 * - 光盘边缘还碰得到盒面、且未入卡口时，盖子最多合到这里；
 * - 盖子低于这里时，光盘也不能进入盒面。
 */
export const DISC_LID_LIMIT = Math.PI / 3;
/** 盖子打开到 60° 才允许取放光盘。 */
export const DISC_ACCESS_ANGLE = DISC_LID_LIMIT;

/** 光盘悬停时离开盒面的距离（根空间单位）。 */
export const DISC_LIFT = 0.12;
/** 光盘在盒面内的拖动尺度（根空间单位 / 屏幕像素）。 */
export const DISC_DRAG_UNITS_PER_PX = 0.0023;
/** 光盘可移动范围的安全边距（相对光盘半径）。 */
export const DISC_SAFETY_RADIUS_RATIO = 0.12;
/** 回到卡口的吸附半径（相对光盘半径）。 */
export const DISC_SNAP_RADIUS_RATIO = 0.2;
/**
 * 交互画面里可移动的范围（根空间单位）：不是卡口附近的小框，而是铰链右侧的整块屏幕。
 * 交互盒已经上移到墙面上，不再有台面限制，所以上下都放开。
 */
export const DISC_DOWN_RANGE = 1.35;
export const DISC_UP_RANGE = 1.35;
export const DISC_RIGHT_RANGE = 2.4;

/** 悬停/回位使用不同的阻尼，产生"先快后慢"的变速感。 */
export const DISC_HOVER_LAMBDA = 9;
export const DISC_DRAG_LAMBDA = 28;

export interface DiscBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface CaseArea {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

/** 光盘边缘是否还接触盒面；完全离开盒面后允许盖子完全合上。 */
export const isDiscTouchingCase = (
  centerX: number,
  centerY: number,
  radius: number,
  area: CaseArea
): boolean => {
  const closestX = Math.min(area.maxX, Math.max(area.minX, centerX));
  const closestY = Math.min(area.maxY, Math.max(area.minY, centerY));

  return Math.hypot(centerX - closestX, centerY - closestY) <= radius + 1e-6;
};

export const clampLidAngle = (angle: number): number => Math.min(LID_MAX, Math.max(0, angle));

/**
 * 向左拖（deltaX < 0）开盖，向右拖合盖。
 * 光盘不在卡口里时由调用方传入 minAngle=90°，保证盖子不会扫过光盘。
 */
export const lidAngleForDrag = (startAngle: number, deltaX: number, minAngle = 0): number =>
  Math.min(LID_MAX, Math.max(clampLidAngle(minAngle), startAngle - deltaX * LID_RAD_PER_PX));

/** 盖子必须打开到 90° 才能取盘或放回。 */
export const canAccessDisc = (lidAngle: number): boolean => lidAngle >= DISC_ACCESS_ANGLE - 1e-6;

/** 合上状态下必须抓盒盖右半边；已经打开后允许从任意位置合上。 */
export const shouldStartLidDrag = (lidAngle: number, isRightHalf: boolean): boolean =>
  lidAngle > 0.05 || isRightHalf;

/** 已经取出的光盘在关盖后仍可移动，但不能在未打开到 90° 时放回。 */
export const shouldStartDiscDrag = (canAccess: boolean, discOut: boolean): boolean => canAccess || discOut;

export const discBounds = (hingeX: number, homeX: number, homeY: number, radius: number): DiscBounds => {
  const safety = radius * DISC_SAFETY_RADIUS_RATIO;

  return {
    minX: hingeX + radius + safety,
    maxX: homeX + DISC_RIGHT_RANGE,
    minY: homeY - DISC_DOWN_RANGE,
    maxY: homeY + DISC_UP_RANGE
  };
};

export const clampDiscCenter = (x: number, y: number, bounds: DiscBounds): { x: number; y: number } => ({
  x: Math.min(bounds.maxX, Math.max(bounds.minX, x)),
  y: Math.min(bounds.maxY, Math.max(bounds.minY, y))
});

/**
 * 盖子在安全角以下时，把光盘挡在盒面外：如果盘沿已经碰到盒面，就沿最近方向推出去。
 * 这是“盖子限制光盘进入”的另一半，保证两边不会互相穿模。
 */
export const clampDiscOutsideCase = (
  centerX: number,
  centerY: number,
  radius: number,
  area: CaseArea,
  bounds: DiscBounds
): { x: number; y: number } => {
  const closestX = Math.min(area.maxX, Math.max(area.minX, centerX));
  const closestY = Math.min(area.maxY, Math.max(area.minY, centerY));
  const deltaX = centerX - closestX;
  const deltaY = centerY - closestY;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance >= radius) {
    return clampDiscCenter(centerX, centerY, bounds);
  }

  if (distance > 1e-6) {
    const scale = radius / distance;

    return clampDiscCenter(closestX + deltaX * scale, closestY + deltaY * scale, bounds);
  }

  // 盘心在盒面内：选最近的边推出去，推到“边缘 + 半径”的外侧。
  const left = centerX - area.minX;
  const right = area.maxX - centerX;
  const bottom = centerY - area.minY;
  const top = area.maxY - centerY;
  const nearest = Math.min(left, right, bottom, top);

  if (nearest === left) {
    return clampDiscCenter(area.minX - radius, centerY, bounds);
  }

  if (nearest === right) {
    return clampDiscCenter(area.maxX + radius, centerY, bounds);
  }

  if (nearest === bottom) {
    return clampDiscCenter(centerX, area.minY - radius, bounds);
  }

  return clampDiscCenter(centerX, area.maxY + radius, bounds);
};

export const discSnapRadius = (radius: number): number => radius * DISC_SNAP_RADIUS_RATIO;

export const isNearHub = (offsetX: number, offsetY: number, radius: number): boolean =>
  Math.hypot(offsetX, offsetY) <= discSnapRadius(radius);

/** 吸附必须同时满足"靠近卡口"和"盖子已打开到可取放角度"。 */
export const shouldSnapDisc = (offsetX: number, offsetY: number, radius: number, canAccess: boolean): boolean =>
  canAccess && isNearHub(offsetX, offsetY, radius);

export interface DiscLiftState {
  readonly canAccess: boolean;
  readonly discHeld: boolean;
  readonly discHovered: boolean;
  readonly discOut: boolean;
  /** 刚吸附回卡口后，鼠标仍停在光盘上时不要立刻再次抬起。 */
  readonly hoverLocked: boolean;
}

/** true 表示光盘应离开卡口（向前抬起）。 */
export const shouldLiftDisc = (state: DiscLiftState): boolean =>
  state.discHeld ||
  state.discOut ||
  (state.discHovered && !state.hoverLocked && state.canAccess);
