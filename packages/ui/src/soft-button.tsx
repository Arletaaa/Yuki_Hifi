import type { ButtonHTMLAttributes } from "react";
import { cn } from "./lib/cn";

interface SoftButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly tone?: "primary" | "ghost";
}

export const SoftButton = ({ className, tone = "ghost", type = "button", ...props }: SoftButtonProps) => {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50",
        tone === "primary"
          ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200"
          : "bg-white/10 text-slate-100 hover:bg-white/15",
        className
      )}
      type={type}
      {...props}
    />
  );
};
