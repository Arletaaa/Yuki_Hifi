import React from "react";
import ReactDOM from "react-dom/client";
import "@arlhifi/ui/styles.css";
import "./styles/base.css";
import "./styles/scene.css";
import { App } from "./App";
import { ManageWindow } from "./components/manage-window";

const isManageWindow = new URLSearchParams(window.location.search).get("manage") === "1";
const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

const render = (): void => {
  root.render(
    <React.StrictMode>{isManageWindow ? <ManageWindow /> : <App />}</React.StrictMode>
  );
};

if (import.meta.env.DEV && isManageWindow) {
  // 管理窗口依赖 preload / demo API，等它就绪再渲染，避免首帧读到 undefined。
  void import("./dev/demo").then((module) => {
    module.installDemoDesktopApi();
    render();
  });
} else {
  render();

  // 开发预览：补齐 preload API 并注入示例曲库。先渲染再注入，避免首帧被动态导入阻塞。
  if (import.meta.env.DEV) {
    void import("./dev/demo").then((module) => {
      module.installDemoDesktopApi();
    });
  }
}
