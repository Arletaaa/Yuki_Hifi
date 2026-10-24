import type { ReactNode } from "react";
import { cn } from "@arlhifi/ui";

export interface EmptyStateProps {
  readonly action?: ReactNode;
  readonly className?: string;
  readonly copy: string;
  readonly icon: ReactNode;
  readonly title: string;
}

export const EmptyState = ({ action, className, copy, icon, title }: EmptyStateProps) => {
  return (
    <div className={cn("empty-state", className)}>
      <div aria-hidden="true" className="empty-state__icon">
        {icon}
      </div>
      <h2 className="empty-state__title">{title}</h2>
      <p className="empty-state__copy">{copy}</p>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
};
