export const DEMO_DIRECTORY = "D:\\Music\\Demo Library";

export const getDemoQuery = (): URLSearchParams | null =>
  typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
