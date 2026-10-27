/** Electron 会给 invoke 的异常加上 "Error invoking remote method…" 前缀，展示前剥掉。 */
export const getDesktopErrorMessage = (error: unknown, fallback = "操作失败，请重试。"): string => {
  const message = error instanceof Error ? error.message.trim() : "";

  if (message.length === 0) {
    return fallback;
  }

  return message.replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/u, "").trim() || fallback;
};
