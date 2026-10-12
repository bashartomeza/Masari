import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/**
 * Monochromatic icon + description + optional action, per the design system's
 * "Empty States" rule. Also used for the sidebar tabs that have no backing API
 * yet, so the console never renders invented data.
 */
export function EmptyState({
  icon = "inventory_2",
  title,
  description,
  action,
  compact = false
}: {
  icon?: IconName;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "empty empty--compact" : "empty"}>
      <span className="empty__icon">
        <Icon name={icon} size={compact ? 22 : 30} />
      </span>
      <p className="empty__title">{title}</p>
      {description && <p className="empty__description">{description}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} className="skeleton__line" />
      ))}
    </div>
  );
}
