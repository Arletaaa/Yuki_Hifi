import type { PropsWithChildren } from "react";
import { cn } from "./lib/cn";

export interface PanelProps extends PropsWithChildren {
  readonly className?: string;
  readonly label?: string;
}

export const Panel = ({ children, className, label }: PanelProps) => {
  return (
    <section aria-label={label} className={cn("al-panel", className)}>
      {children}
    </section>
  );
};
