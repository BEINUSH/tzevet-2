"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "sm";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand-gold text-white font-bold hover:brightness-95",
  secondary:
    "bg-brand-navy-lighter border border-brand-border text-brand-white hover:border-brand-gold/50",
  ghost: "bg-transparent text-brand-muted hover:text-brand-white",
  danger: "bg-brand-danger text-white hover:brightness-95",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-2 text-sm rounded-lg",
  md: "px-5 py-3 text-base rounded-xl",
  lg: "px-6 py-4 text-lg rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 font-[var(--font-sans)]",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
