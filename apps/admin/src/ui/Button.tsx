import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "action" | "secondary" | "outline" | "destructive" | "ghost";
export type ButtonSize = "sm" | "md";

/**
 * The button family from the Stitch design MD: Primary (deep brand), Action
 * (reserved for "go/accept/confirm"), Secondary (10% tint), Outline, and
 * Destructive. `ghost` is the unstyled icon-button used in table rows.
 */
export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconEnd,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconEnd?: IconName;
  children?: ReactNode;
}) {
  const classes = ["btn", `btn--${variant}`, `btn--${size}`, className].filter(Boolean).join(" ");
  return (
    <button type="button" {...rest} className={classes}>
      {icon && <Icon name={icon} size={size === "sm" ? 16 : 18} />}
      {children != null && children !== "" && <span>{children}</span>}
      {iconEnd && <Icon name={iconEnd} size={size === "sm" ? 16 : 18} />}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button type="button" aria-label={label} title={label} {...rest} className={["icon-btn", className].filter(Boolean).join(" ")}>
      <Icon name={icon} size={20} />
    </button>
  );
}
