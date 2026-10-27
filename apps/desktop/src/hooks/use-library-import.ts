import { useCallback, useEffect, useState } from "react";
import type { ImportSkippedFile, LibraryImportProgress, LibraryImportResult } from "@arlhifi/shared";
import { usePlayerStore } from "../store/player-store";

export type LibraryImportPhase = "idle" | "running" | "done" | "error";

export interface LibraryImportState {
  readonly message: string | null;
  readonly phase: LibraryImportPhase;
  readonly progress: LibraryImportProgress | null;
}

const idleState: LibraryImportState = { message: null, phase: "idle", progress: null };
const webPreviewMessage = "网页预览无法导入音乐，请使用 Electron 桌面应用。";

/** Electron 会给 invoke 的异常加上 "Error invoking remote method…" 前缀，展示前剥掉。 */
const toErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message.trim() : "";

  if (message.length === 0) {
    return "导入失败，请重试。";
  }

  return message.replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/u, "").trim() || "导入失败，请重试。";
};

const countReason = (skipped: readonly ImportSkippedFile[], reason: ImportSkippedFile["reason"]): number =>
  skipped.filter((entry) => entry.reason === reason).length;

const describeImport = (result: LibraryImportResult): string => {
  const parts = [`已导入 ${result.imported.length} 首`];
  const duplicates = countReason(result.skipped, "duplicate");
  const unsupported = countReason(result.skipped, "unsupported");
  const failed = countReason(result.skipped, "failed");

  if (duplicates > 0) {
    parts.push(`已存在 ${duplicates} 首`);
  }

  if (unsupported > 0) {
    parts.push(`格式不支持 ${unsupported} 首`);
  }

  if (failed > 0) {
    parts.push(`失败 ${failed} 首`);
  }

  if (result.imported.length === 0 && result.skipped.length === 0) {
    return "没有找到可导入的音频文件。";
  }

  return parts.join(" · ");
};

/** 导入动作 + 进度 + 结果文案；导入完成后从主进程重新读取曲库。 */
export const useLibraryImport = () => {
  const loadLibrary = usePlayerStore((state) => state.loadLibrary);
  const rebuildQueueFromLibrary = usePlayerStore((state) => state.rebuildQueueFromLibrary);
  const [state, setState] = useState<LibraryImportState>(idleState);

  useEffect(() => {
    const api = window.arltHifiDesktop;

    if (!api) {
      return;
    }

    return api.onLibraryImportProgress((progress) => {
      setState((current) => (current.phase === "running" ? { ...current, progress } : current));
    });
  }, []);

  const runImport = useCallback(
    async (kind: "files" | "folder"): Promise<void> => {
      const api = window.arltHifiDesktop;

      if (!api) {
        setState({ message: webPreviewMessage, phase: "error", progress: null });
        return;
      }

      setState({ message: null, phase: "running", progress: null });

      try {
        let result: LibraryImportResult;

        if (kind === "files") {
          const selection = await api.selectAudioFiles();

          if (selection.canceled || selection.filePaths.length === 0) {
            setState(idleState);
            return;
          }

          result = await api.importAudioFiles(selection.filePaths);
        } else {
          const folder = await api.importAudioFolder();

          if (folder.canceled) {
            setState(idleState);
            return;
          }

          result = folder;
        }

        loadLibrary(await api.loadLibrary());
        // 队列当前恒等于曲库：导入后重建，新曲目才能接着播。
        rebuildQueueFromLibrary();
        setState({ message: describeImport(result), phase: "done", progress: null });
      } catch (error) {
        setState({ message: toErrorMessage(error), phase: "error", progress: null });
      }
    },
    [loadLibrary, rebuildQueueFromLibrary]
  );

  const importFiles = useCallback((): void => {
    void runImport("files");
  }, [runImport]);

  const importFolder = useCallback((): void => {
    void runImport("folder");
  }, [runImport]);

  return {
    importFiles,
    importFolder,
    state,
    busy: state.phase === "running"
  };
};
