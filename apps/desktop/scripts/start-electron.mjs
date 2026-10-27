import { spawn } from "node:child_process";
import { once } from "node:events";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getStagedElectronBinary,
  stageElectronRuntime,
  workspaceElectronCli
} from "./electron-runtime.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(scriptDir, "..");
const electronEnv = { ...process.env };

// DSH/Code 类宿主会设置 ELECTRON_RUN_AS_NODE=1，继承下去 Electron 会当纯 Node 跑。
delete electronEnv.ELECTRON_RUN_AS_NODE;

const extraArgs = process.argv.slice(2);

const launchWorkspaceElectron = () =>
  spawn(process.execPath, [workspaceElectronCli, ".", ...extraArgs], {
    cwd: desktopRoot,
    env: electronEnv,
    shell: false,
    stdio: "inherit"
  });

const launchStagedElectron = (stagedBinary) =>
  spawn(stagedBinary, [".", ...extraArgs], {
    cwd: desktopRoot,
    env: electronEnv,
    shell: false,
    stdio: "inherit"
  });

const launchStarted = Date.now();
const cachedElectronBinary = await getStagedElectronBinary();
let electron = cachedElectronBinary
  ? launchStagedElectron(cachedElectronBinary)
  : launchWorkspaceElectron();
let [exitCode] = await once(electron, "exit");

if (
  process.platform === "win32" &&
  exitCode === 2147483651 &&
  !cachedElectronBinary &&
  Date.now() - launchStarted < 60_000
) {
  console.warn(
    "[start] Electron 无法从工作区目录启动（0x80000003），改为从 LOCALAPPDATA 的运行时副本启动…"
  );

  const stagedBinary = await stageElectronRuntime();
  electron = launchStagedElectron(stagedBinary);
  [exitCode] = await once(electron, "exit");
}

process.exit(typeof exitCode === "number" ? exitCode : 0);
