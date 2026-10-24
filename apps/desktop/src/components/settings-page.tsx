import { ImagePlus, RotateCcw } from "lucide-react";
import { createBackgroundMediaUrl } from "@arlhifi/shared";
import { Button, SegmentedControl, type SegmentedOption } from "@arlhifi/ui";
import { useEffectiveMotionTier } from "../hooks/use-app-preferences";
import type { MotionTier, ThemeMode } from "@arlhifi/shared";
import { useSettingsStore } from "../store/settings-store";
import { useWallpaperStore } from "../store/wallpaper-store";

const themeOptions: readonly SegmentedOption<ThemeMode>[] = [
  { label: "深色", value: "dark" },
  { label: "浅色", value: "light" }
];

const motionOptions: readonly SegmentedOption<MotionTier>[] = [
  { label: "关闭", value: "off" },
  { label: "标准", value: "standard" },
  { label: "丰富", value: "rich" }
];

const motionHint: Record<MotionTier, string> = {
  off: "所有过渡瞬时完成，适合低性能设备或系统已开启「减少动态效果」。",
  standard: "状态过渡与列表编排，唱片静止。",
  rich: "额外开启唱片转动、唱针动画与指针视差。"
};

export interface SettingsPageProps {
  readonly onSelectWallpaper: () => void;
  readonly wallpaperErrorMessage: string | null;
}

export const SettingsPage = ({ onSelectWallpaper, wallpaperErrorMessage }: SettingsPageProps) => {
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const motionTier = useSettingsStore((state) => state.motionTier);
  const setMotionTier = useSettingsStore((state) => state.setMotionTier);
  const wallpaperPath = useWallpaperStore((state) => state.path);
  const dim = useWallpaperStore((state) => state.dim);
  const blur = useWallpaperStore((state) => state.blur);
  const setDim = useWallpaperStore((state) => state.setDim);
  const setBlur = useWallpaperStore((state) => state.setBlur);
  const resetWallpaper = useWallpaperStore((state) => state.reset);
  const effectiveMotionTier = useEffectiveMotionTier();

  return (
    <section className="page">
      <header className="page__header">
        <div className="page__heading">
          <p className="page__eyebrow">
            PREFERENCES<span className="page__kana">せってい</span>
          </p>
          <h1 className="page__title">设置</h1>
          <p className="page__sub">外观、背景与能力边界</p>
        </div>
      </header>

      <div className="page__body page__body--scroll">
        <div className="settings">
          <section className="settings__group">
            <h2 className="settings__title">外观</h2>

            <div className="setting-row">
              <div className="setting-row__text">
                <p className="setting-row__label">主题</p>
                <p className="setting-row__hint">深色为默认；浅色用于白天或明亮环境。</p>
              </div>
              <SegmentedControl label="主题" onChange={setTheme} options={themeOptions} value={theme} />
            </div>

            <div className="setting-row">
              <div className="setting-row__text">
                <p className="setting-row__label">动效强度</p>
                <p className="setting-row__hint">
                  {motionHint[motionTier]}
                  {effectiveMotionTier !== motionTier ? "（系统已启用减少动态效果，实际为关闭）" : ""}
                </p>
              </div>
              <SegmentedControl label="动效强度" onChange={setMotionTier} options={motionOptions} value={motionTier} />
            </div>
          </section>

          <section className="settings__group">
            <h2 className="settings__title">背景</h2>

            <div className="setting-row">
              <div className="setting-row__text">
                <p className="setting-row__label">壁纸</p>
                <p className="setting-row__hint">默认使用内置夜景；也可以选用本地图片，任何设置都不会遮挡播放控制。</p>
              </div>
              <div className="wallpaper-actions">
                <div className="wallpaper-preview" data-empty={wallpaperPath ? "false" : "true"}>
                  {wallpaperPath ? <img alt="当前壁纸预览" src={createBackgroundMediaUrl(wallpaperPath)} /> : <span>内置夜景</span>}
                </div>
                <div className="wallpaper-buttons">
                  <Button onClick={onSelectWallpaper} size="sm" variant="ghost">
                    <ImagePlus aria-hidden="true" size={15} />
                    选择图片
                  </Button>
                  <Button disabled={!wallpaperPath} onClick={resetWallpaper} size="sm" variant="quiet">
                    <RotateCcw aria-hidden="true" size={15} />
                    恢复默认
                  </Button>
                </div>
              </div>
            </div>

            {wallpaperErrorMessage ? <p className="setting-row__error">{wallpaperErrorMessage}</p> : null}

            <div className="setting-row">
              <div className="setting-row__text">
                <p className="setting-row__label">暗化</p>
                <p className="setting-row__hint">提高蒙版不透明度，保证壁纸再亮也看得清文字。</p>
              </div>
              <div className="range-field">
                <input
                  aria-label="壁纸暗化"
                  className="range"
                  max={60}
                  min={0}
                  onChange={(event) => {
                    setDim(Number(event.currentTarget.value));
                  }}
                  type="range"
                  value={dim}
                />
                <span className="range-field__value">{dim}%</span>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-row__text">
                <p className="setting-row__label">模糊</p>
                <p className="setting-row__hint">柔化细节，让文字成为视觉重心。</p>
              </div>
              <div className="range-field">
                <input
                  aria-label="壁纸模糊"
                  className="range"
                  max={12}
                  min={0}
                  onChange={(event) => {
                    setBlur(Number(event.currentTarget.value));
                  }}
                  type="range"
                  value={blur}
                />
                <span className="range-field__value">{blur}px</span>
              </div>
            </div>
          </section>

          <section className="settings__group">
            <h2 className="settings__title">关于</h2>

            <div className="setting-row">
              <div className="setting-row__text">
                <p className="setting-row__label">Arlt HiFi Player 0.1.0</p>
                <p className="setting-row__hint">本地音乐播放器 · Electron + React · 当前播放基于 HTMLAudioElement</p>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-row__text">
                <p className="setting-row__label">能力边界</p>
                <ul className="limit-list">
                  <li>音频解码与输出设备控制需接入 audio-core，当前未接入，界面不会显示无法验证的信号数值。</li>
                  <li>曲目信息来自文件标签；无标签时回退文件名并标注。</li>
                  <li>不包含角色舞台、Live2D、MV 或动态视觉舞台。</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
};
