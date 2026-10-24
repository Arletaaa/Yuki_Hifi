import electron from "electron";
import type { ArltHifiDesktopApi, DirectorySelectionResult, Track } from "@arlhifi/shared";

const { contextBridge, ipcRenderer } = electron;
const selectMusicDirectoryChannel = "library:select-music-directory";
const scanMusicDirectoryChannel = "library:scan-music-directory";

const desktopApi: ArltHifiDesktopApi = {
  platform: process.platform,
  selectMusicDirectory: async (): Promise<DirectorySelectionResult> => {
    return ipcRenderer.invoke(selectMusicDirectoryChannel) as Promise<DirectorySelectionResult>;
  },
  scanMusicDirectory: async (directoryPath: string): Promise<readonly Track[]> => {
    return ipcRenderer.invoke(scanMusicDirectoryChannel, directoryPath) as Promise<readonly Track[]>;
  }
};

contextBridge.exposeInMainWorld("arltHifiDesktop", desktopApi);
