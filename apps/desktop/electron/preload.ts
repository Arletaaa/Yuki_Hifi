import electron from "electron";
import type {
  AppSettings,
  ArltHifiDesktopApi,
  AudioFileSelectionResult,
  BackgroundImageSelectionResult,
  FolderImportResult,
  LibraryImportProgress,
  LibraryImportResult,
  Track
} from "@arlhifi/shared";

const { contextBridge, ipcRenderer } = electron;
const selectAudioFilesChannel = "library:select-files";
const importAudioFilesChannel = "library:import-files";
const importAudioFolderChannel = "library:import-folder";
const loadLibraryChannel = "library:load";
const libraryImportProgressChannel = "library:import-progress";
const selectBackgroundImageChannel = "settings:select-background-image";
const loadSettingsChannel = "settings:load";
const saveSettingsChannel = "settings:save";

const desktopApi: ArltHifiDesktopApi = {
  platform: process.platform,
  selectAudioFiles: async (): Promise<AudioFileSelectionResult> => {
    return ipcRenderer.invoke(selectAudioFilesChannel) as Promise<AudioFileSelectionResult>;
  },
  importAudioFiles: async (filePaths: readonly string[]): Promise<LibraryImportResult> => {
    return ipcRenderer.invoke(importAudioFilesChannel, [...filePaths]) as Promise<LibraryImportResult>;
  },
  importAudioFolder: async (): Promise<FolderImportResult> => {
    return ipcRenderer.invoke(importAudioFolderChannel) as Promise<FolderImportResult>;
  },
  loadLibrary: async (): Promise<readonly Track[]> => {
    return ipcRenderer.invoke(loadLibraryChannel) as Promise<readonly Track[]>;
  },
  onLibraryImportProgress: (handler: (progress: LibraryImportProgress) => void): (() => void) => {
    const listener = (_event: unknown, progress: LibraryImportProgress): void => {
      handler(progress);
    };

    ipcRenderer.on(libraryImportProgressChannel, listener);

    return () => {
      ipcRenderer.removeListener(libraryImportProgressChannel, listener);
    };
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
