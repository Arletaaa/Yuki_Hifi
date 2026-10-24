/// <reference types="vite/client" />

import type { ArltHifiDesktopApi } from "@arlhifi/shared";

declare global {
  interface Window {
    readonly arltHifiDesktop?: ArltHifiDesktopApi;
  }
}
