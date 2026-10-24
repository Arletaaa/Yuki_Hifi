import { rmSync } from "node:fs";

// 清掉上一次的产物，避免已删除/已排除的文件残留在打包目录里。
for (const directory of ["dist-electron"]) {
  rmSync(directory, { force: true, recursive: true });
}
