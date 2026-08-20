import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "outline" | "quiet";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "btn-accent",
  outline: "btn-outline",
  quiet: "btn-quiet",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
