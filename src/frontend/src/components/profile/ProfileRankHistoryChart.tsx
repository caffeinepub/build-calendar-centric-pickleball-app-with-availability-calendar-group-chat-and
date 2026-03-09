import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TimeRange = "week" | "month" | "year" | "all";

interface ProfileRankHistoryChartProps {
  data: Array<[bigint, bigint]>; // [timestamp_nanoseconds, rank]
  range: TimeRange;
}

function formatLabel(date: Date, range: TimeRange): string {
  if (range === "week") {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  if (range === "year") {
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProfileRankHistoryChart({
  data,
  range,
}: ProfileRankHistoryChartProps) {
  const filteredData = useMemo(() => {
    const now = Date.now();
    let cutoffMs: number | null = null;

    if (range === "week") {
      cutoffMs = now - 7 * 24 * 60 * 60 * 1000;
    } else if (range === "month") {
      cutoffMs = now - 30 * 24 * 60 * 60 * 1000;
    } else if (range === "year") {
      cutoffMs = now - 365 * 24 * 60 * 60 * 1000;
    }

    return data
      .map(([tsNanos, rank]) => {
        const ms = Number(tsNanos / 1_000_000n);
        return {
          ms,
          rank: Number(rank),
          date: formatLabel(new Date(ms), range),
        };
      })
      .filter(({ ms }) => {
        if (ms > now) return false;
        if (cutoffMs !== null && ms < cutoffMs) return false;
        return true;
      })
      .sort((a, b) => a.ms - b.ms);
  }, [data, range]);

  // Determine Y axis domain (inverted: rank 1 at top)
  const ranks = filteredData.map((d) => d.rank);
  const maxRank = ranks.length > 0 ? Math.max(...ranks) : 10;
  const minRank = ranks.length > 0 ? Math.min(...ranks) : 1;
  // Add padding so the line doesn't clip the top/bottom
  const domainMax = Math.max(maxRank + 1, minRank + 3);
  const domainMin = Math.max(1, minRank - 1);

  if (filteredData.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No rank history for this time range
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart
        data={filteredData}
        margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
      >
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
          reversed
          domain={[domainMin, domainMax]}
          tickFormatter={(v) => `#${v}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value: number) => [`#${value}`, "Rank"]}
        />
        <Line
          type="monotone"
          dataKey="rank"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3, fill: "hsl(var(--primary))" }}
          activeDot={{ r: 5 }}
          name="Rank"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
