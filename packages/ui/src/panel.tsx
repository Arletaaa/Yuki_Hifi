import type { PropsWithChildren } from "react";
import { cn } from "./lib/cn";

interface PanelProps extends PropsWithChildren {
  readonly className?: string;
  readonly title?: string;
}

export const Panel = ({ children, className, title }: PanelProps) => {
  return (
    <section className={cn("rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-sm", className)}>
      {title ? <h2 className="mb-3 text-sm font-semibold text-slate-100">{title}</h2> : null}
      {children}
    </section>
  );
};
