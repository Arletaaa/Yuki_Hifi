import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./lib/cn";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly active?: boolean;
  readonly children: ReactNode;
  readonly label: string;
}

export const IconButton = ({ active = false, children, className, label, type = "button", ...props }: IconButtonProps) => {
  return (
    <button
      aria-label={label}
      className={cn("al-icon-button", active && "is-active", className)}
      title={label}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
};
