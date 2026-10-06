"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDateShort } from "@/lib/format";

const NAVY = "#043873";
const BRAND = "#4F9CF9";
const TEAL = "#0d9488";
const AMBER = "#f59e0b";
const RED = "#dc2626";
const CRITICAL = "#b91c1c";
const GREY = "#94a3b8";

const axisProps = {
  tick: { fill: "#6b7280", fontSize: 11 },
  axisLine: { stroke: "#e3e9f2" },
  tickLine: false,
} as const;

const tooltipStyle = {
  contentStyle: {
    borderRadius: 10,
    border: "1px solid #e3e9f2",
    boxShadow: "0 8px 24px rgba(2,32,63,0.10)",
    fontSize: 12,
  },
  labelStyle: { color: "#043873", fontWeight: 600, fontSize: 12 },
} as const;

export function ClaimTrendChart({
  data,
}: {
  data: { date: string; claims: number; suspicious: number }[];
}) {
  const shaped = data.map((d) => ({ ...d, label: formatDateShort(d.date) }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={shaped} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="trendClaims" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.35} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
        <YAxis {...axisProps} width={44} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
        <Area
          type="monotone"
          dataKey="claims"
          name="Total klaim"
          stroke={BRAND}
          strokeWidth={2}
          fill="url(#trendClaims)"
        />
        <Line
          type="monotone"
          dataKey="suspicious"
          name="Mencurigakan"
          stroke={RED}
          strokeWidth={2}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryDistributionChart({
  data,
}: {
  data: { category: string; value: number }[];
}) {
  const colors = [BRAND, TEAL, AMBER, NAVY];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="category"
          innerRadius={52}
          outerRadius={82}
          paddingAngle={2}
          stroke="#fff"
          strokeWidth={2}
        >
          {data.map((entry, index) => (
            <Cell key={entry.category} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PriorityDistributionChart({
  data,
}: {
  data: { priority: string; value: number }[];
}) {
  const colorByPriority: Record<string, string> = {
    CRITICAL,
    HIGH: RED,
    MEDIUM: AMBER,
    LOW: GREY,
  };
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
        <XAxis dataKey="priority" {...axisProps} />
        <YAxis {...axisProps} width={44} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="value" name="Jumlah klaim" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.priority} fill={colorByPriority[entry.priority] ?? GREY} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SuspiciousPerDayChart({
  data,
}: {
  data: { date: string; value: number }[];
}) {
  const shaped = data.map((d) => ({ ...d, label: formatDateShort(d.date) }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={shaped} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
        <YAxis {...axisProps} width={44} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Bar
          dataKey="value"
          name="Klaim mencurigakan"
          fill={AMBER}
          radius={[6, 6, 0, 0]}
          maxBarSize={26}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopRulesChart({
  data,
}: {
  data: { ruleId: string; name: string; count: number }[];
}) {
  const shaped = data.slice(0, 6).map((d) => ({ ...d, label: `${d.ruleId}` }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={shaped} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" horizontal={false} />
        <XAxis type="number" {...axisProps} allowDecimals={false} />
        <YAxis type="category" dataKey="label" {...axisProps} width={78} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="count" name="Jumlah terpicu" fill={NAVY} radius={[0, 6, 6, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CapacityComparisonChart({
  data,
}: {
  data: { label: string; kapasitas: number; klaim: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={48} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
        <Bar dataKey="kapasitas" name="Kapasitas" fill={TEAL} radius={[6, 6, 0, 0]} maxBarSize={38} />
        <Bar dataKey="klaim" name="Klaim" fill={RED} radius={[6, 6, 0, 0]} maxBarSize={38} />
      </BarChart>
    </ResponsiveContainer>
  );
}
