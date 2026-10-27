import type { PageId } from "../components/app-rail";

export const DEMO_DIRECTORY = "D:\\Music\\Demo Library";

const isDemoRequested = (): boolean =>
  import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo");

export const getDemoQuery = (): URLSearchParams | null =>
  typeof window === "undefined" ? null : new URLSearchParams(window.location.search);

export const getDemoInitialPage = (): PageId | null => {
  const params = getDemoQuery();

  if (!isDemoRequested() || !params) {
    return null;
  }

  const page = params.get("page");

  return page === "library" || page === "queue" || page === "settings" ? page : null;
};

/** S2R-0：开发模式下用 `?scene=1` 直接打开 3D 长廊实验场景。 */
export const isScenePreviewRequested = (): boolean => {
  const params = getDemoQuery();

  return import.meta.env.DEV && Boolean(params?.has("scene"));
};

/** `?tracks=240` 可在不导入曲库的情况下压测更长长廊。 */
export const getScenePreviewTrackCount = (): number | null => {
  const params = getDemoQuery();
  const raw = params?.get("tracks");

  if (!raw) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/** `?spin=1` 让镜头持续巡游，用于读取真实渲染帧率。 */
export const getSceneAutoSpin = (): boolean => Boolean(getDemoQuery()?.has("spin"));
