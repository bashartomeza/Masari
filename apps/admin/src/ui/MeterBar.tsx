import type { Tone } from "./StatusBadge";

/** Labelled progress meter from the "استخدام السائقين" utilisation card. */
export function MeterBar({
  label,
  value,
  display,
  tone = "info"
}: {
  label: string;
  /** 0–100. Clamped, so an out-of-range API value cannot break the layout. */
  value: number;
  display?: string;
  tone?: Tone;
}) {
  const percent = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className="meter">
      <div className="meter__head">
        <span>{label}</span>
        <span>{display ?? `${Math.round(percent)}%`}</span>
      </div>
      <div
        className="meter__track"
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`meter__fill meter__fill--${tone}`} style={{ inlineSize: `${percent}%` }} />
      </div>
    </div>
  );
}

/** The seven-bar "حجم الرحلات اليوم" chart, driven by real values. */
export function BarChart({ bars, label }: { bars: Array<{ id: string; value: number; title?: string }>; label: string }) {
  const peak = Math.max(1, ...bars.map((bar) => bar.value));
  return (
    <div className="barchart" role="img" aria-label={label}>
      {bars.map((bar) => (
        <span
          key={bar.id}
          className="barchart__bar"
          title={bar.title}
          style={{ blockSize: `${Math.max(4, (bar.value / peak) * 100)}%` }}
        />
      ))}
    </div>
  );
}
