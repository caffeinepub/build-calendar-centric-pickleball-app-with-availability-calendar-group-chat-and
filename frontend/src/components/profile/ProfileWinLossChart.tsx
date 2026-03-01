import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DayWithLog } from '../../backend';
import { dateFromDayId, getDayId } from '../../lib/date';

type TimeRange = 'week' | 'month' | 'year' | 'all';

interface ProfileWinLossChartProps {
  data: DayWithLog[];
}

const RANGE_LABELS: Record<TimeRange, string> = {
  week: 'Week',
  month: 'Month',
  year: 'Year',
  all: 'All Time',
};

function formatLabel(date: Date, range: TimeRange): string {
  if (range === 'week') {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  if (range === 'year') {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ProfileWinLossChart({ data }: ProfileWinLossChartProps) {
  const [range, setRange] = useState<TimeRange>('month');

  const filteredData = useMemo(() => {
    const now = new Date();

    // Compute cutoff dayId based on range, anchored to today
    let cutoffDayId: bigint | null = null;

    if (range === 'week') {
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 7);
      cutoffDayId = getDayId(cutoff);
    } else if (range === 'month') {
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 30);
      cutoffDayId = getDayId(cutoff);
    } else if (range === 'year') {
      const cutoff = new Date(now);
      cutoff.setFullYear(now.getFullYear() - 1);
      cutoffDayId = getDayId(cutoff);
    }
    // 'all' has no cutoff

    const todayDayId = getDayId(now);

    return data
      .filter(entry => {
        // Never show future dates
        if (entry.day > todayDayId) return false;
        // Apply range cutoff
        if (cutoffDayId !== null && entry.day < cutoffDayId) return false;
        return true;
      })
      .map(entry => ({
        // Use dateFromDayId which correctly decodes YYYYMMDD format
        date: formatLabel(dateFromDayId(entry.day), range),
        wins: Number(entry.wins),
        losses: Number(entry.losses),
        // Keep raw dayId for sorting
        _dayId: entry.day,
      }))
      // Sort ascending by date
      .sort((a, b) => (a._dayId < b._dayId ? -1 : a._dayId > b._dayId ? 1 : 0));
  }, [data, range]);

  const isEmpty = filteredData.length === 0 || filteredData.every(d => d.wins === 0 && d.losses === 0);

  return (
    <div className="space-y-4">
      {/* Range selector */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {(Object.keys(RANGE_LABELS) as TimeRange[]).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              range === r
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Chart */}
      {isEmpty ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          No match data for this time range
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={filteredData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar
              dataKey="wins"
              fill="#22c55e"
              radius={[3, 3, 0, 0]}
              name="Wins"
              maxBarSize={40}
            />
            <Bar
              dataKey="losses"
              fill="#ef4444"
              radius={[3, 3, 0, 0]}
              name="Losses"
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
