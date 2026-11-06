'use client';

type Props = {
  label: string;
  actual: number;
  target: number;
  /** qualitative ranges as fractions of target: [poorMax, satisfactoryMax] e.g. [0.7, 0.9] */
  ranges?: [number, number];
  format?: (n: number) => string;
  invert?: boolean; // true when lower is better (e.g. NPL ratio)
};

/**
 * Compact bullet chart for operational targets (HandzJ DNA).
 */
export default function BulletChart({
  label,
  actual,
  target,
  ranges = [0.7, 1.0],
  format = (n) => n.toLocaleString(),
  invert = false,
}: Props) {
  const max = Math.max(actual, target * 1.25, 1);
  const pct = (v: number) => Math.min(100, (v / max) * 100);
  const [poor, ok] = ranges;

  const actualColor = invert
    ? actual <= target * poor
      ? 'bg-bv-success'
      : actual <= target * ok
        ? 'bg-bv-warning'
        : 'bg-bv-danger'
    : actual >= target
      ? 'bg-bv-success'
      : actual >= target * poor
        ? 'bg-bv-warning'
        : 'bg-bv-danger';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-bv-muted">{label}</span>
        <span className="tabular-nums text-bv-text font-semibold">
          {format(actual)}
          <span className="text-bv-meta font-normal"> / {format(target)}</span>
        </span>
      </div>
      <div className="relative h-4 rounded-bv overflow-hidden bg-bv-hover">
        {/* qualitative bands */}
        <div
          className="absolute inset-y-0 left-0 bg-bv-danger-bg"
          style={{ width: `${pct(target * poor)}%` }}
        />
        <div
          className="absolute inset-y-0 bg-bv-warning-bg"
          style={{ left: `${pct(target * poor)}%`, width: `${pct(target * ok) - pct(target * poor)}%` }}
        />
        <div
          className="absolute inset-y-0 bg-bv-success-bg"
          style={{ left: `${pct(target * ok)}%`, right: 0 }}
        />
        {/* actual bar */}
        <div
          className={`absolute inset-y-1 left-0 rounded-sm ${actualColor}`}
          style={{ width: `${pct(actual)}%` }}
        />
        {/* target marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-bv-action"
          style={{ left: `${pct(target)}%` }}
          title={`Target: ${format(target)}`}
        />
      </div>
    </div>
  );
}
