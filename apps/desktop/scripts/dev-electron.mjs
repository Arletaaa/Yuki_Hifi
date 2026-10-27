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
const electron = spawn(process.execPath, [electronEntry, mainEntry], {
  cwd: desktopRoot,
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: `${localUrl}${devQuery}`
  },
  shell: false,
  stdio: "inherit"
});

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

const [exitCode] = await once(electron, "exit");
await server.close();
process.exit(typeof exitCode === "number" ? exitCode : 0);
