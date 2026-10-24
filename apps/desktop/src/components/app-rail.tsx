import { Library, ListMusic, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@arlhifi/ui";

export type PageId = "library" | "queue" | "settings";

interface RailItem {
  readonly id: PageId;
  readonly icon: LucideIcon;
  readonly label: string;
}

const railItems: readonly RailItem[] = [
  { id: "library", icon: Library, label: "音乐库" },
  { id: "queue", icon: ListMusic, label: "队列" },
  { id: "settings", icon: Settings, label: "设置" }
];

export interface AppRailProps {
  readonly onNavigate: (page: PageId) => void;
  readonly page: PageId;
  readonly trackCount: number;
}

export const AppRail = ({ onNavigate, page, trackCount }: AppRailProps) => {
  return (
    <aside className="rail">
      <div className="rail__brand" title="Arlt HiFi Player">
        <span aria-hidden="true" className="rail__mark" />
        <span className="rail__brand-name">Arlt</span>
        <span className="rail__brand-kana">ひふぃ</span>
      </div>

      <nav aria-label="主导航" className="rail__nav">
        {railItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === page;

          return (
            <button
              aria-current={isActive ? "page" : undefined}
              className={cn("rail__item", isActive && "is-active")}
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
              }}
              type="button"
            >
              <Icon aria-hidden="true" size={20} strokeWidth={1.6} />
              <span className="rail__label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="rail__footer">
        <span className="rail__count">{trackCount > 0 ? `${trackCount} 曲` : "空"}</span>
        <span className="rail__version">v0.1.0</span>
      </div>
    </aside>
  );
};
