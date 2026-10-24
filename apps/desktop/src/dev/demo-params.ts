import type { PageId } from "../components/app-rail";

export const DEMO_DIRECTORY = "D:\\Music\\Demo Library";

const isDemoRequested = (): boolean =>
  import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo");

export const getDemoQuery = (): URLSearchParams | null =>
  typeof window === "undefined" ? null : new URLSearchParams(window.location.search);

export const getDemoDirectoryPath = (): string | null => (isDemoRequested() ? DEMO_DIRECTORY : null);

export const getDemoInitialPage = (): PageId | null => {
  const params = getDemoQuery();

  if (!isDemoRequested() || !params) {
    return null;
  }

  const page = params.get("page");

  return page === "library" || page === "queue" || page === "settings" ? page : null;
};
