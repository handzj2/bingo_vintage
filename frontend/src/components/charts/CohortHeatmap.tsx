'use client';

type Cell = {
  cohort: string;       // e.g. "Jan 2025"
  bucket: string;       // e.g. "Current", "1-30", "91+ / NPL"
  percent: number;      // 0–100
};

type Props = {
  data: Cell[];
  cohorts: string[];    // row order
  buckets: string[];    // column order
  title?: string;
};

/**
 * Cohort heatmap — disbursement month × aging outcome.
 * Colour intensity uses restrained red scale for NPL risk (HandzJ DNA).
 */
export default function CohortHeatmap({ data, cohorts, buckets, title }: Props) {
  const lookup = new Map<string, number>();
  data.forEach((c) => lookup.set(`${c.cohort}::${c.bucket}`, c.percent));

  // Map percent to background intensity (0–100 → light gray to deep red)
  const cellBg = (pct: number, isNplCol: boolean) => {
    if (pct <= 0) return '#F9FAFB';
    if (!isNplCol) {
      // Healthy columns: soft green-gray
      if (pct >= 70) return '#DCFCE7';
      if (pct >= 40) return '#FEF9C3';
      return '#FEE2E2';
    }
    // NPL / late columns: sequential red
    if (pct >= 30) return '#991B1B';
    if (pct >= 20) return '#DC2626';
    if (pct >= 10) return '#F87171';
    if (pct >= 5)  return '#FECACA';
    return '#FEF2F2';
  };

  const cellText = (pct: number, isNplCol: boolean) => {
    if (isNplCol && pct >= 20) return '#FFFFFF';
    return '#111827';
  };

  return (
    <div className="overflow-x-auto">
      {title && (
        <h3 className="text-sm font-semibold text-bv-text mb-3">{title}</h3>
      )}
      <table className="w-full text-xs border-collapse min-w-[520px]">
        <thead>
          <tr>
            <th className="text-left py-2 pr-3 text-bv-meta font-medium sticky left-0 bg-bv-surface">
              Cohort
            </th>
            {buckets.map((b) => (
              <th key={b} className="py-2 px-2 text-center text-bv-meta font-medium whitespace-nowrap">
                {b}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort) => (
            <tr key={cohort}>
              <td className="py-1.5 pr-3 font-medium text-bv-text sticky left-0 bg-bv-surface whitespace-nowrap">
                {cohort}
              </td>
              {buckets.map((bucket) => {
                const pct = lookup.get(`${cohort}::${bucket}`) ?? 0;
                const isNpl = /npl|91|180|default/i.test(bucket);
                return (
                  <td
                    key={bucket}
                    className="py-1.5 px-2 text-center tabular-nums font-medium border border-bv-border/60"
                    style={{
                      backgroundColor: cellBg(pct, isNpl),
                      color: cellText(pct, isNpl),
                    }}
                    title={`${cohort} · ${bucket}: ${pct.toFixed(1)}%`}
                  >
                    {pct > 0 ? `${pct.toFixed(1)}%` : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-bv-meta mt-2">
        Colour intensity reflects share of outstanding principal in each aging bucket. NPL columns use a red sequential scale.
      </p>
    </div>
  );
}
