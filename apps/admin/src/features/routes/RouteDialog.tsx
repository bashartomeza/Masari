import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";
import { translations } from "../../i18n/translations";

export type RouteDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

type RouteDialogDirectionProps = {
  dir?: "ltr" | "rtl";
};

export function RouteDialog({
  open,
  title,
  description,
  busy = false,
  onClose,
  children,
  footer,
  dir = "ltr"
}: RouteDialogProps & RouteDialogDirectionProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const closeLabel = dir === "rtl" ? translations.ar.routeDialogClose : translations.en.routeDialogClose;

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTarget = dialogRef.current?.querySelector<HTMLElement>(
      "[autofocus], button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])"
    );
    focusTarget?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [busy, onClose, open]);

  if (!open) return null;

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (!busy && event.target === event.currentTarget) onClose();
  }

  return (
    <div className="route-dialog-backdrop" aria-disabled={busy || undefined} onClick={closeFromBackdrop}>
      <div
        ref={dialogRef}
        className="route-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        dir={dir}
      >
        <header className="route-dialog__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId} className="muted">{description}</p>}
          </div>
          <button type="button" className="route-dialog__close" aria-label={closeLabel} disabled={busy} onClick={onClose}>
            {closeLabel}
          </button>
        </header>
        <div className="route-dialog__body">{children}</div>
        {footer && <footer className="route-dialog__footer">{footer}</footer>}
      </div>
    </div>
  );
}
