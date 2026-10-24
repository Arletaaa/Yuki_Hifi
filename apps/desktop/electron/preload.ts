import electron from "electron";
import type {
  AppSettings,
  ArltHifiDesktopApi,
  BackgroundImageSelectionResult,
  DirectorySelectionResult,
  Track
} from "@arlhifi/shared";

const { contextBridge, ipcRenderer } = electron;
const selectMusicDirectoryChannel = "library:select-music-directory";
const scanMusicDirectoryChannel = "library:scan-music-directory";
const selectBackgroundImageChannel = "settings:select-background-image";
const loadSettingsChannel = "settings:load";
const saveSettingsChannel = "settings:save";

const desktopApi: ArltHifiDesktopApi = {
  platform: process.platform,
  selectMusicDirectory: async (): Promise<DirectorySelectionResult> => {
    return ipcRenderer.invoke(selectMusicDirectoryChannel) as Promise<DirectorySelectionResult>;
  },
  scanMusicDirectory: async (directoryPath: string): Promise<readonly Track[]> => {
    return ipcRenderer.invoke(scanMusicDirectoryChannel, directoryPath) as Promise<readonly Track[]>;
  },
  selectBackgroundImage: async (): Promise<BackgroundImageSelectionResult> => {
    return ipcRenderer.invoke(selectBackgroundImageChannel) as Promise<BackgroundImageSelectionResult>;
  },
  loadSettings: async (): Promise<AppSettings> => {
    return ipcRenderer.invoke(loadSettingsChannel) as Promise<AppSettings>;
  },
  saveSettings: async (settings: AppSettings): Promise<AppSettings> => {
    return ipcRenderer.invoke(saveSettingsChannel, settings) as Promise<AppSettings>;
  }
};

contextBridge.exposeInMainWorld("arltHifiDesktop", desktopApi);
