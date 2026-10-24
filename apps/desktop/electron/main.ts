import electron from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DirectorySelectionResult } from "@arlhifi/shared";
import { createMediaProtocolAccess, registerMediaProtocolPrivileges } from "./media-protocol.js";
import { scanMusicDirectory } from "./music-scanner.js";

const { app, BrowserWindow, dialog, ipcMain } = electron;
const currentDir = dirname(fileURLToPath(import.meta.url));
const devServerUrl = process.env.VITE_DEV_SERVER_URL;
const selectMusicDirectoryChannel = "library:select-music-directory";
const scanMusicDirectoryChannel = "library:scan-music-directory";
const mediaProtocolAccess = createMediaProtocolAccess();

registerMediaProtocolPrivileges();

ipcMain.handle(selectMusicDirectoryChannel, async (): Promise<DirectorySelectionResult> => {
  const activeWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const options: electron.OpenDialogOptions = {
    title: "选择音乐文件夹",
    properties: ["openDirectory"]
  };
  const result = activeWindow ? await dialog.showOpenDialog(activeWindow, options) : await dialog.showOpenDialog(options);

  return {
    canceled: result.canceled,
    directoryPath: result.filePaths[0] ?? null
  };
});

ipcMain.handle(scanMusicDirectoryChannel, async (_event, directoryPath: unknown) => {
  if (typeof directoryPath !== "string" || directoryPath.trim().length === 0) {
    throw new Error("A valid music directory path is required.");
  }

  const tracks = await scanMusicDirectory(directoryPath);
  mediaProtocolAccess.allowAudioFilePaths(tracks.map((track) => track.filePath));

  return tracks;
});

const createWindow = async (): Promise<void> => {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#10131f",
    title: "Arlt HiFi Player",
    webPreferences: {
      preload: join(currentDir, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (devServerUrl) {
    await window.loadURL(devServerUrl);
    return;
  }

  await window.loadFile(join(currentDir, "../dist/index.html"));
};

app.whenReady().then(() => {
  mediaProtocolAccess.registerHandler();
  void createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
