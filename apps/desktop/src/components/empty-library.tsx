import { FolderPlus, Loader2 } from "lucide-react";

export type LibraryScanStatus = "idle" | "selecting" | "scanning" | "success" | "empty" | "error";

interface EmptyLibraryProps {
  readonly directoryPath: string | null;
  readonly errorMessage: string | null;
  readonly onSelectDirectory: () => void;
  readonly scanStatus: LibraryScanStatus;
}

const statusCopy: Record<LibraryScanStatus, string> = {
  idle: "选择本地音乐目录后，播放器会扫描支持的音频文件并生成音乐库列表。",
  selecting: "正在等待你选择本地音乐文件夹。",
  scanning: "正在递归扫描目录中的 flac、wav、mp3、m4a、ogg 文件。",
  success: "扫描完成。",
  empty: "这个目录里没有发现支持的音频文件，可以换一个音乐文件夹试试。",
  error: "扫描目录时遇到问题，请确认文件夹仍然存在且应用有读取权限。"
};

export const EmptyLibrary = ({ directoryPath, errorMessage, onSelectDirectory, scanStatus }: EmptyLibraryProps) => {
  const isBusy = scanStatus === "selecting" || scanStatus === "scanning";

  return (
    <div className="empty-library glass-panel">
      <div className="empty-card">
        <div className="empty-icon">
          {scanStatus === "scanning" ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={32} />
          ) : (
            <FolderPlus aria-hidden="true" size={32} />
          )}
        </div>
        <h3 className="empty-title">音乐库还是空的</h3>
        <p className="empty-copy">{statusCopy[scanStatus]}</p>
        <button className="primary-action mt-5" disabled={isBusy} onClick={onSelectDirectory} type="button">
          {scanStatus === "selecting" ? "正在选择..." : scanStatus === "scanning" ? "正在扫描..." : "选择音乐文件夹"}
        </button>
        {directoryPath ? (
          <div className="directory-card">
            <p className="directory-label">当前目录</p>
            <p className="directory-path">{directoryPath}</p>
          </div>
        ) : null}
        {errorMessage ? <p className="error-copy">{errorMessage}</p> : null}
      </div>
    </div>
  );
};
