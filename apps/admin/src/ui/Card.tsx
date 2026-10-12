import type { ReactNode } from "react";

/** Level-1 surface from the design system: white, 1px stroke, soft shadow. */
export function Card({
  children,
  className,
  span,
  padded = true,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  /** Column span inside the 12-column bento grid. */
  span?: number;
  padded?: boolean;
} & { id?: string; "aria-labelledby"?: string }) {
  const classes = ["card", padded ? "card--padded" : "", span ? `span-${span}` : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <section {...rest} className={classes}>
      {children}
    </section>
  );
}

export function CardHeader({ title, action, badge }: { title: ReactNode; action?: ReactNode; badge?: ReactNode }) {
  return (
    <div className="card__header">
      <h3 className="card__title">
        {title}
        {badge}
      </h3>
      {action}
    </div>
  );
}

/** 12-column, 24px-gutter bento grid used by every Stitch admin canvas. */
export function BentoGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={["bento-grid", className].filter(Boolean).join(" ")}>{children}</div>;
}
