import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import type { Tone } from "./StatusBadge";

/** Leading-border alert row from the "تنبيهات حرجة" rail. */
export function AlertItem({
  tone = "danger",
  icon = "warning",
  title,
  description,
  actions
}: {
  tone?: Tone;
  icon?: IconName;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={`alert alert--${tone}`}>
      <span className="alert__icon">
        <Icon name={icon} size={20} />
      </span>
      <div className="alert__body">
        <p className="alert__title">{title}</p>
        {description && <p className="alert__description">{description}</p>}
        {actions && <div className="alert__actions">{actions}</div>}
      </div>
    </div>
  );
}

/** Page-level success/error notice. Keeps the `role="status"` contract. */
export function Notice({ kind, children }: { kind: "success" | "error"; children: ReactNode }) {
  return (
    <div role="status" className={`notice notice--${kind}`}>
      <Icon name={kind === "success" ? "check" : "warning"} size={18} />
      <span>{children}</span>
    </div>
  );
}
