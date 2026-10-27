import { createRequire } from "node:module";
import { access, cp, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

/** npm electron 包的 cli 入口（用 node 启动它，再由它启动真正的 Electron）。 */
export const workspaceElectronCli = require.resolve("electron/cli.js");
/** electron 包导出的可执行文件路径（`dist/electron.exe`）。 */
export const workspaceElectronBinary = require("electron");
export const workspaceElectronDist = dirname(workspaceElectronBinary);

const fileExists = async (filePath) => {
  try {
    await access(filePath);

    return true;
  } catch {
    return false;
  }
};

const getLocalAppData = () =>
  process.env.LOCALAPPDATA ?? join(process.env.USERPROFILE ?? process.cwd(), "AppData", "Local");

const getStagedPaths = async () => {
  const version = (await readFile(join(workspaceElectronDist, "version"), "utf8")).trim();
  const cacheRoot = join(getLocalAppData(), "arlt-hifi-dev", `electron-${version}`);
  const binaryName = process.platform === "win32" ? "electron.exe" : "electron";
  const binaryPath = join(cacheRoot, binaryName);

  return { binaryPath, cacheRoot, version };
};

/** 已缓存的工作区外 Electron 运行时；没有则返回 null。 */
export const getStagedElectronBinary = async () => {
  if (process.platform !== "win32") {
    return null;
  }

  const { binaryPath } = await getStagedPaths();

  return (await fileExists(binaryPath)) ? binaryPath : null;
};

/**
 * 工作区（G:\MyProjects\...）带有 DSH 的 Low integrity / deny-delete 权限，
 * Electron 从这些目录启动会在 Chromium 初始化阶段崩溃（0x80000003）。
 * 把 Electron 运行时复制到 LOCALAPPDATA 下再启动即可绕过，缓存按版本号复用。
 */
export const stageElectronRuntime = async () => {
  const { binaryPath, cacheRoot, version } = await getStagedPaths();

  if (await fileExists(binaryPath)) {
    return binaryPath;
  }

  console.warn(`[electron] 正在把 Electron ${version} 运行时复制到 ${cacheRoot}（首次约需数秒）…`);
  await rm(cacheRoot, { force: true, recursive: true });
  await mkdir(cacheRoot, { recursive: true });
  await cp(workspaceElectronDist, cacheRoot, { recursive: true });

  if (!(await fileExists(binaryPath))) {
    throw new Error(`Electron 运行时复制失败：${binaryPath}`);
  }

  return binaryPath;
};
