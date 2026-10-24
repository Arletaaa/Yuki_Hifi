import type { ButtonHTMLAttributes } from "react";
import { cn } from "./lib/cn";

export type ButtonVariant = "primary" | "ghost" | "quiet";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
}

export const Button = ({ className, size = "md", type = "button", variant = "ghost", ...props }: ButtonProps) => {
  return (
    <button
      className={cn("al-button", `al-button--${variant}`, size !== "md" && `al-button--${size}`, className)}
      type={type}
      {...props}
    />
  );
};
