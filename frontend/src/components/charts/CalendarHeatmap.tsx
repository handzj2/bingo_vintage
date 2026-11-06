'use client';

type DayValue = {
  date: string;   // YYYY-MM-DD
  amount: number;
};

type Props = {
  data: DayValue[];
  title?: string;
  weeks?: number; // how many weeks to show (default ~13 = 90 days)
};

/**
 * Calendar heatmap of daily collections intensity.
 * HandzJ: restrained sequential teal scale, high contrast labels.
 */
export default function CalendarHeatmap({ data, title, weeks = 13 }: Props) {
  const map = new Map(data.map((d) => [d.date, d.amount]));
  const max = Math.max(...data.map((d) => d.amount), 1);

  // Build grid ending today, going back `weeks` weeks, Mon–Sun
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1));
  // Align to Monday
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);

  const days: { date: Date; key: string; amount: number }[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    days.push({ date: new Date(cursor), key, amount: map.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const intensity = (amount: number) => {
    if (amount <= 0) return '#F3F4F6';
    const t = amount / max;
    if (t > 0.8) return '#134E4A';
    if (t > 0.6) return '#0F766E';
    if (t > 0.4) return '#14B8A6';
    if (t > 0.2) return '#5EEAD4';
    return '#CCFBF1';
  };

  const weekRows: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weekRows.push(days.slice(i, i + 7));
  }

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div>
      {title && <h3 className="text-sm font-semibold text-bv-text mb-3">{title}</h3>}
      <div className="flex gap-1 text-[10px] text-bv-meta mb-1 pl-8">
        {dayLabels.map((d) => (
          <div key={d} className="w-4 text-center">{d[0]}</div>
        ))}
      </div>
      <div className="space-y-1">
        {weekRows.map((week, wi) => (
          <div key={wi} className="flex items-center gap-1">
            <span className="w-7 text-[9px] text-bv-meta tabular-nums">
              {week[0]?.date.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            </span>
            {week.map((d) => (
              <div
                key={d.key}
                className="w-4 h-4 rounded-sm border border-bv-border/40"
                style={{ backgroundColor: intensity(d.amount) }}
                title={`${d.key}: ${d.amount > 0 ? d.amount.toLocaleString() : 'No collections'}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-bv-meta">
        <span>Less</span>
        {['#F3F4F6', '#CCFBF1', '#5EEAD4', '#14B8A6', '#0F766E', '#134E4A'].map((c) => (
          <div key={c} className="w-3 h-3 rounded-sm border border-bv-border/40" style={{ backgroundColor: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
