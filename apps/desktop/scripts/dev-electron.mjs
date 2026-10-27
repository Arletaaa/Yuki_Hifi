import { spawn } from "node:child_process";
import { once } from "node:events";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(scriptDir, "..");
const require = createRequire(import.meta.url);

const run = async (command, args) => {
  const child = spawn(command, args, {
    cwd: desktopRoot,
    shell: false,
    stdio: "inherit"
  });

  const [exitCode] = await once(child, "exit");
  if (exitCode !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${String(exitCode)}`);
  }
};

const mainEntry = join(desktopRoot, ".dev-electron", "main.js");
const electronEntry = require.resolve("electron/cli.js");

await run(process.execPath, [join(scriptDir, "build-electron.mjs"), "--dev"]);

const server = await createServer({
  configFile: join(desktopRoot, "vite.config.ts"),
  root: desktopRoot,
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false
  }
});

await server.listen();
server.printUrls();

const localUrl = server.resolvedUrls?.local[0];
if (!localUrl) {
  await server.close();
  throw new Error("Vite dev server did not provide a local URL.");
}

// 开发期调试入口：ARLT_DEV_QUERY="?scene=1&spin=1" pnpm dev
const devQuery = process.env.ARLT_DEV_QUERY ?? "";
// Windows 11 25H2（26200+）的沙箱 GPU 进程会 STATUS_BREAKPOINT 崩溃；
// 命令行参数必须提前传，避免主进程代码还没执行就退出。
const defaultSwitches = process.platform === "win32" ? ["--disable-gpu-sandbox"] : [];
const electronEnv = { ...process.env, VITE_DEV_SERVER_URL: `${localUrl}${devQuery}` };

// DSH/Code 类宿主会设置 ELECTRON_RUN_AS_NODE=1，继承下去 Electron 会当纯 Node 跑。
delete electronEnv.ELECTRON_RUN_AS_NODE;

const launchElectron = (switches) =>
  spawn(process.execPath, [electronEntry, ...switches, mainEntry], {
    cwd: desktopRoot,
    env: electronEnv,
    shell: false,
    stdio: "inherit"
  });

const launchStarted = Date.now();
let electron = launchElectron(defaultSwitches);
console.log(`[dev] electron switches: ${defaultSwitches.join(" ") || "(none)"}`);

const shutdown = async () => {
  if (!electron.killed) {
    electron.kill();
  }
  await server.close();
};

process.on("SIGINT", () => {
  void shutdown().finally(() => {
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  void shutdown().finally(() => {
    process.exit(0);
  });
});

let [exitCode] = await once(electron, "exit");

// Windows 11 26200+ 的 GPU 沙箱/LPAC 兼容问题：关掉 GPU 沙箱仍起不来时，
// 用 --no-sandbox 再试一次（仅开发脚本，打包产物不会带这个参数）。
if (
  process.platform === "win32" &&
  exitCode === 2147483651 &&
  Date.now() - launchStarted < 60_000
) {
  console.warn(
    "[dev] Electron 启动即退出（STATUS_BREAKPOINT 0x80000003），改用 --no-sandbox 重试一次。"
  );
  electron = launchElectron(["--no-sandbox"]);
  [exitCode] = await once(electron, "exit");
}

await server.close();
process.exit(typeof exitCode === "number" ? exitCode : 0);
