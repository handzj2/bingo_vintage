'use client';

/**
 * Pure CSS/HTML waterfall — no recharts dependency.
 * HandzJ DNA: near-black totals, success inflows, danger outflows.
 */

export type WaterfallStep = {
  name: string;
  value: number;
  isTotal?: boolean;
};

type Props = {
  data: WaterfallStep[];
  height?: number;
  currencyPrefix?: string;
};

export default function WaterfallChart({
  data,
  height = 280,
  currencyPrefix = 'UGX ',
}: Props) {
  if (!data?.length) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-bv-meta border border-bv-border rounded-bv bg-bv-hover">
        No cash movement data
      </div>
    );
  }

  let running = 0;
  const steps = data.map((step) => {
    if (step.isTotal) {
      running = step.value;
      return {
        name: step.name,
        display: step.value,
        barStart: 0,
        barEnd: step.value,
        isTotal: true,
        isPositive: step.value >= 0,
      };
    }
    const prev = running;
    running += step.value;
    const low = Math.min(prev, running);
    const high = Math.max(prev, running);
    return {
      name: step.name,
      display: step.value,
      barStart: low,
      barEnd: high,
      isTotal: false,
      isPositive: step.value >= 0,
    };
  });

  const allVals = steps.flatMap((s) => [s.barStart, s.barEnd]);
  const minY = Math.min(0, ...allVals);
  const maxY = Math.max(0, ...allVals);
  const range = maxY - minY || 1;

  const fmt = (n: number) => {
    const sign = n < 0 ? '\u2212' : '';
    return `${sign}${currencyPrefix}${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const toPct = (v: number) => ((v - minY) / range) * 100;

  return (
    <div className="w-full" style={{ minHeight: height }}>
      <div className="flex items-end gap-2 sm:gap-3 h-52 px-1">
        {steps.map((step, i) => {
          const bottom = toPct(step.barStart);
          const top = toPct(step.barEnd);
          const barHeight = Math.max(2, top - bottom);
          const colour = step.isTotal
            ? 'bg-bv-action'
            : step.isPositive
              ? 'bg-bv-success'
              : 'bg-bv-danger';

          return (
            <div key={i} className="flex-1 flex flex-col items-center h-full justify-end relative">
              <div className="w-full flex-1 relative">
                <div
                  className={`absolute left-1 right-1 rounded-t-sm ${colour} transition-all`}
                  style={{
                    bottom: `${bottom}%`,
                    height: `${barHeight}%`,
                  }}
                  title={`${step.name}: ${fmt(step.display)}`}
                />
                <div
                  className="absolute left-0 right-0 border-t border-bv-border-strong pointer-events-none"
                  style={{ bottom: `${toPct(0)}%` }}
                />
              </div>
              <p className="text-[10px] sm:text-xs font-semibold text-bv-text tabular-nums mt-1 text-center leading-tight">
                {fmt(step.display)}
              </p>
              <p className="text-[9px] sm:text-[10px] text-bv-meta text-center mt-0.5 truncate w-full">
                {step.name}
              </p>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-bv-meta">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-bv-action" /> Total / balance
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-bv-success" /> Inflow
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-bv-danger" /> Outflow / variance
        </span>
      </div>
    </div>
  );
}
