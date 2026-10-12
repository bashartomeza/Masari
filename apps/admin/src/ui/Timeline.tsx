import type { ReactNode } from "react";
import { Icon } from "./Icon";

export type TimelineStep = {
  id: string;
  title: ReactNode;
  detail?: ReactNode;
  state: "done" | "current" | "pending";
};

/**
 * Vertical connector rail used by driver verification and the batching
 * delivery sequence. Completed steps take the brand colour, the current step
 * takes the action colour, pending steps recede to the neutral ramp.
 */
export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="timeline">
      {steps.map((step) => (
        <li key={step.id} className={`timeline__step is-${step.state}`}>
          <span className="timeline__marker">
            {step.state === "done" ? <Icon name="check" size={13} /> : null}
          </span>
          <div className="timeline__body">
            <p className="timeline__title">{step.title}</p>
            {step.detail && <p className="timeline__detail">{step.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Horizontal variant used for the trip lifecycle rail. */
export function StatusRail({ steps }: { steps: Array<{ id: string; label: ReactNode; state: "done" | "current" | "pending" }> }) {
  return (
    <ol className="status-rail">
      {steps.map((step) => (
        <li key={step.id} className={`status-rail__step is-${step.state}`}>
          <span className="status-rail__dot" />
          <span className="status-rail__label">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}
